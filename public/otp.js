const RecorderWorker = (() => {
  function RecorderWorker() {

  }

  const findFirstFrame = (stream, mp3Info) => {

    for (let i = 0; i < stream.byteLength; i++) {
      const frame = mp3Parser.readFrame(stream, i, true);

      if (frame) {
        mp3Info.sampleLength = frame._section.sampleLength;
        mp3Info.samplingRate = frame.header.samplingRate;
        mp3Info.bitrate = frame.header.bitrate;
        mp3Info.numChannels = frame.header.channelModeBits == "11" ? 1 : 2;
        mp3Info.isProtected = !frame.header.isProtected;
        mp3Info.frames.push(frame._section.offset);

        return frame._section.nextFrameIndex - 1;
      }

    }
  }

  const parseStream = (_stream, mp3Info) => {
    mp3Info.frames = [];
    const stream = new DataView(_stream);

    const offset = findFirstFrame(stream, mp3Info);

    try {
      for (let i = offset; i <= stream.byteLength; i++) {

        const frame = mp3Parser.readFrame(stream, i, true);

        if (frame) {
          mp3Info.frames.push(frame._section.offset);

          i = frame._section.nextFrameIndex - 1;
        }
      }
    } catch (err) {

    }

    if (!mp3Info.frames.length) {
      throw new Error("not mp3");
    }

    mp3Info.samplesRatio = mp3Info.frames.length * mp3Info.sampleLength;

    mp3Info.duration = mp3Info.frames.length * mp3Info.sampleLength / mp3Info.samplingRate;

    mp3Info.audioData = stream.buffer;
  }

  const processStream = (streamData, mp3Info) => {
    return new Promise((resolve, reject) => {
      try {
        parseStream(streamData, mp3Info);
      } catch (err) {
        return reject({ id: 406, error: "not mp3", type: "error" });
      }


      resolve(new Uint8Array(streamData));

    });
  }

  const floatTo16BitPCM = (input) => {
    const output = new Int16Array(input.length);

    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF);
    }

    return output;
  };

  const encode = function (arrayBuffer) {
    var remaining = arrayBuffer.length;

    for (var i = 0; remaining >= 0; i += self.maxSamples) {
      var left = arrayBuffer.subarray(i, i + self.maxSamples);
      const buffer = self.encoder.encodeBuffer(left);
      self.recordBuffer.push(new Uint8Array(buffer));
      remaining -= self.maxSamples;
    }
  };

  const updateParserLib = () => {
    mp3ParserLib.bitrateMap["00"] = {
      "01": {
        "0000": "free",
        "0001": 8,
        "0010": 16,
        "0011": 24,
        "0100": 32,
        "0101": 40,
        "0110": 48,
        "0111": 56,
        "1000": 64,
        "1001": 80,
        "1010": 96,
        "1011": 112,
        "1100": 128,
        "1101": 144,
        "1110": 160,
        "1111": "bad"
      },
      "10": {
        "0000": "free",
        "0001": 8,
        "0010": 16,
        "0011": 24,
        "0100": 32,
        "0101": 40,
        "0110": 48,
        "0111": 56,
        "1000": 64,
        "1001": 80,
        "1010": 96,
        "1011": 112,
        "1100": 128,
        "1101": 144,
        "1110": 160,
        "1111": "bad"
      },
      "11": {
        "0000": "free",
        "0001": 32,
        "0010": 48,
        "0011": 56,
        "0100": 64,
        "0101": 80,
        "0110": 96,
        "0111": 112,
        "1000": 128,
        "1001": 144,
        "1010": 160,
        "1011": 176,
        "1100": 192,
        "1101": 224,
        "1110": 256,
        "1111": "bad"
      },

    };
    mp3ParserLib.sampleLengthMap["00"] = { "01": 576, "10": 1152, "11": 384 };
  }

  const onMessage = function (event) {
    switch (event.data.type) {

      case 'appendData':

        if (self.record) {
          self.encode(self.floatTo16BitPCM(event.data.data));
        }

        break;
      case 'init':
        self.updateParserLib();

        self.sampleRate = event.data.sampleRate || 44100;
        self.bufferSize = event.data.bufferSize || 2048;
        self.minAndMaxSamples = [];
        self.recordBuffer = [];
        self.maxSamples = 2304;
        self.encoder = new lamejs.Mp3Encoder(1, self.sampleRate, 256);
        self.record = false;

        self.postMessage({
          type: 'init'
        });

        break;

      case 'startRecord':
        self.record = !self.record;

        self.postMessage({
          handlerId: event.data.handlerId,
          type: 'startRecord',
          record: self.record
        });

        break;

      case 'stopRecord':
        self.record = !self.record;

        self.recordBuffer.push(self.encoder.flush());

        self.duration = self.recordBuffer.length * self.bufferSize / self.sampleRate;

        self.numFramesInSecond = self.recordBuffer.length / self.duration;

        const encodedBlob = { blob: new Blob(self.recordBuffer, { type: 'audio/mp3' }) };

        self.recordBuffer.length = 0;

        const fileReader = new FileReader();

        fileReader.onload = (evt) => {
          const mp3Info = {};

          delete encodedBlob.blob;

          self.processStream(evt.target.result, mp3Info).then((result) => {
            const audioData = new Uint8Array(mp3Info.audioData);

            const _mp3Info = Object.assign({}, {
              samplesRatio: mp3Info.samplesRatio,
              duration: mp3Info.duration,
              numChannels: mp3Info.numChannels,
              samplingRate: mp3Info.samplingRate,
              frames: new Int32Array(mp3Info.frames)
            });

            for (const key of Object.keys(mp3Info)) {
              delete mp3Info[key];
            }

            self.postMessage({
              handlerId: event.data.handlerId,
              type: 'stopRecord',
              mp3Info: _mp3Info,
              audioData: audioData
            }, [audioData.buffer, _mp3Info.frames.buffer]);

          }).catch((error) => {
            self.postMessage({
              handlerId: event.data.handlerId,
              type: 'processError',
              error: error
            });

            self.postMessage({
              handlerId: event.data.handlerId,
              type: 'processComplete',
              mp3Info: {}
            });
          });
        }

        fileReader.onerror = (evt) => {
          self.postMessage({
            type: 'fileOpenError',
            result: {
              handlerId: event.data.handlerId,
              error: evt.target.error
            }
          });
        }

        fileReader.readAsArrayBuffer(encodedBlob.blob);


        break;

      case 'reset':
        self.recordBuffer = [];
        self.minAndMaxSamples = [];
        self.record = false;
        break;
    }
  }

  RecorderWorker.prototype.toString = (params = {}) => {

    return `importScripts('${params.origin}/v2/js/lame.min.js','${params.origin}/v2/js/a_worker.lib.js'); 
              self.onmessage = ${onMessage}; 
              self.params = ${JSON.stringify(params)}; 
              self.encode=${encode}; 
              self.floatTo16BitPCM=${floatTo16BitPCM};
              self.processStream=${processStream};
              self.parseStream=${parseStream};
              self.findFirstFrame=${findFirstFrame};
              self.updateParserLib=${updateParserLib};
              `;
  }

  RecorderWorker.getInstance = (params) => {
    return new RecorderWorker().toString(params);
  }

  return RecorderWorker;
})();