"use client"; // This is a client component 👈🏽

import React, { useEffect, useState } from "react";

const Otp = () => {
  const [code, setCode] = useState("xxxx");

  // useEffect(() => {
  //   if (global?.window && "OTPCredential" in global?.window) {
  //     console.log("in OTPCredentials");

  //     global?.window.addEventListener("DOMContentLoaded", (e) => {
  //       const ac = new AbortController();

  //       console.log("WebOTP API is called");

  //       (navigator.credentials as any)
  //         .get({
  //           otp: { transport: ["sms"] },

  //           signal: ac?.signal,
  //         })
  //         .then((otp: any) => {
  //           console.log(otp);

  //           if (otp) {
  //             setCode(otp.code);
  //             ac.abort();

  //             console.log("submit() is called");
  //           }

  //           navigator?.credentials?.preventSilentAccess();
  //         })
  //         .catch((err: any) => {
  //           console.log(err);
  //         });
  //     });
  //   }
  // }, [global?.window]);
  if ("OTPCredential" in global.window) {
    global.window.addEventListener("DOMContentLoaded", (e) => {
      const input = global.document.querySelector(
        'input[autocomplete="one-time-code"]'
      ) as HTMLInputElement;
      if (!input) return;
      // Set up an AbortController to use with the OTP request
      const ac = new AbortController();
      const form = input.closest("form");
      if (form) {
        // Abort the OTP request if the user attempts to submit the form manually
        form.addEventListener("submit", (e) => {
          ac.abort();
        });
      }
      // Request the OTP via get()
      (navigator.credentials as any)
        .get({
          otp: { transport: ["sms"] },
          signal: ac.signal,
        })
        .then((otp: any) => {
          // When the OTP is received by the app client, enter it into the form
          // input and submit the form automatically
          input.value = otp.code;
          if (form) form.submit();
        })
        .catch((err: Error) => {
          console.error(err);
        });
    });
  }
  return (
    <div className="flex text-4xl flex-col ">
      <div className="flex w-full mb-3">
        <h1>Code: </h1>
        <h1> {code} </h1>
      </div>
      <input type="text" autoComplete="one-time-code" inputMode="numeric" />
    </div>
  );
};

export default Otp;
