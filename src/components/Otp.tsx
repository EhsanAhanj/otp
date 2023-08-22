"use client"; // This is a client component 👈🏽

import Script from "next/script";
import React, { useEffect, useState } from "react";

const Otp = () => {
  const [code, setCode] = useState("mmmm");
  useEffect(() => {
    const ac = new AbortController();

    (navigator.credentials as any)
      .get({
        otp: { transport: ["sms"] },

        signal: ac?.signal,
      })
      .then((otp: any) => {
        console.log(otp);
        if (otp) {
          setCode(otp.code);
          ac.abort();
        }

        navigator?.credentials?.preventSilentAccess();
      })
      .catch((err: any) => {
        ac.abort();
        console.log(err);
      });
    // });
  }, []);

  return (
    <div className="flex text-4xl flex-col w-full">
      <div className="flex w-full mb-3 px-5">
        <h1>Code: </h1>
        <h1> {code} </h1>
      </div>
      <form className="w-[200px] px-2" id="primary-form">
        <input
          autoComplete="one-time-code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          id="primary_input"
          onChange={(e) => setCode(e.target.value)}
          value={code}
        />
        <input type="submit" />
      </form>
    </div>
  );
};

export default Otp;
// code :9933

// @ehsanahanj.github.io #9933
