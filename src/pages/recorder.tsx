import AudioRecorder from "@/components/AudioRecorder";
import React, { useState } from "react";

const Recorder = () => {
  let [recordOption, setRecordOption] = useState("audio");

  return (
    <div>
      <h1>React Media Recorder888</h1>
      <div className="button-flex"></div>
      <div>
        <AudioRecorder />
      </div>
    </div>
  );
};

export default Recorder;
