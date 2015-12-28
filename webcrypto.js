

const hexEncodeArray = '0123456789abcdef'.split('')
// see jsper.com/hex-conversion
function ab2hex( ab ) {
  let arr = new Uint8Array(ab)
  let s = ''
  for (let byte of arr) {
    s += hexEncodeArray[ byte >>> 4]
    s += hexEncodeArray[ byte & 0x0f]
  }
  return s
}


function str2ab(str) {
  return Xutf8str2ab(str)
}

function Xutf8str2ab(str) {
  return new TextEncoder('utf-8').encode(str)
}

function utf16str2ab(str) {
  let buf = new ArrayBuffer(str.length*2)
  let view = new Uint16Array(buf)
  for (var i = 0, strlen=str.length; i < strlen; i++) {
    view[i] = str.charCodeAt(i);
    // don't use charAt(i) here.
  }
  return buf;
}

function utf8str2ab(str) {
  let buf = new ArrayBuffer(str.length)
  let view = new Uint8Array(buf)
  for (var i = 0, strlen=str.length; i < strlen; i++) {
    view[i] = str.charCodeAt(i);
    // don't use charAt(i) here.
  }
  return buf;
}


export function promise_compute_sha256(text) {
  let source_head = text.substr(0, 10);
  let ab = str2ab(text)
  let past = new Date();
  return window.crypto.subtle.digest(
      'SHA-256', ab)
    .then( function (result) {
      console.log("Promise then for webcrypto, recording time", source_head)
      var res = {
        hash: ab2hex(result),
        execTime: new Date() - past
      }
      return res
    })
}

var test = false;

if (test) {
  promise_compute_sha256("hello").then(function (res) {
    console.log("sha256 of hello is: ", res)
  })

  promise_compute_sha256("hello").then(function (res) {
    console.log("sha256 of hello is: ", res)
    const expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    if (res.hash !== expected) {
      throw new Error("Expect sha256 of 'hello' to be " + expected)
    }
  }).catch(function (err) {
    console.log(err)
    throw err
  })


  let bytes = new Uint8Array(2)
  bytes[0] = 255
  bytes[1] = 128 + 4


  console.log("ab2hex()=", ab2hex(bytes))
}
