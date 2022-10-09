const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

const room = document.getElementById("room");
const msg = room.querySelector("#msg");
const chatRoom = document.querySelector("#chatting");

const call = document.getElementById("call");

call.hidden = true;
room.hidden = true;

let user;
let myStream;
let partnerStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;
let myDataChannel;

//chatting
function receiveMessage(event) {
  const input = room.querySelector("#msg input");
  const chat = document.createElement("li");
  chat.innerText = event.data;
  chatRoom.append(chat);
}

function handlemessage(event) {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  myDataChannel.send(input.value);
  const chat = document.createElement("li");
  chat.innerText = input.value;
  chatRoom.append(chat);
  input.value = "";
}

msg.addEventListener("submit", handlemessage);

async function handleCameraChange() {
  await getMedia(camerasSelect.value);
  if (myPeerConnection) {
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection.getSenders();
    videoSender.find((sender) => sender.track.kind === "video");
    videoSender.replaceTrack(videoTrack);
  }
}

async function getCamera() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach((camera) => {
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if (currentCamera === camera.label) {
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    });
  } catch (e) {
    console.log(e);
  }
}

async function getMedia(deviceId) {
  const initialConstrains = {
    audio: true,
    video: { facingMode: "user" },
  };
  const cameraConstrains = {
    audio: true,
    video: { deviceId: { exact: deviceId } },
  };
  try {
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstrains : initialConstrains
    );
    myFace.srcObject = myStream;

    if (!deviceId) {
      await getCamera();
    }
  } catch (e) {
    console.log(e);
  }
}
function handleMuteClick() {
  myStream
    .getAudioTracks()
    .forEach((track) => (track.enabled = !track.enabled));
  if (!muted) {
    muteBtn.innerText = "Unmute";
    muted = true;
  } else {
    muteBtn.innerText = "Mute";
    muted = false;
  }
}
function handleCameraClick() {
  myStream
    .getVideoTracks()
    .forEach((track) => (track.enabled = !track.enabled));

  if (!cameraOff) {
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = true;
  } else {
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = false;
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("click", handleCameraChange);

// Welcome Form (join a room)
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const videoCall = document.getElementById("videoCall");

videoCall.addEventListener("click", handleVideochat);

async function handleVideochat() {
  if (call.hidden) {
    call.hidden = false;
  } else {
    call.hidden = true;
    myStream.getTracks().forEach((track) => track.stop());
    partnerStream.getTracks().forEach((track) => track.stop());
  }
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  const input = welcomeForm.querySelector("input");
  welcome.hidden = true;
  room.hidden = false;
  await getMedia();
  makeConnection();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code
function inNout(users) {
  const input = msg.querySelector("input");
  input.innerText = users;
}

socket.on("welcome", async (user, newCount) => {
  inNout(`${user} joined`);
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  myDataChannel = myPeerConnection.createDataChannel("chat");
  myDataChannel.addEventListener("message", (event) => {
    receiveMessage(event);
  });

  console.log("made data channel");
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  console.log("sent the offer");
  socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
  myPeerConnection.addEventListener("datachannel", (event) => {
    myDataChannel = event.channel;
    myDataChannel.addEventListener("message", (event) => {
      receiveMessage(event);
    });
  });
  console.log("received the offer");
  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});
socket.on("answer", (answer) => {
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
  console.log("received the candidate");
  myPeerConnection.addIceCandidate(ice);
});
socket.on("bye", (user, newCount) => {
  inNout(`${user} left`);
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
});

// RTC Code
function makeConnection() {
  myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun3.l.google.com:19302",
          "stun:stun4.l.google.com:19302",
        ],
      },
    ],
  });

  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream
    .getTracks()
    .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
  console.log("sent the candidate");
  socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
  console.log("addstream!!!!!!!!!!");
  const peersFace = document.getElementById("peersFace");
  partnerStream = data.stream;
  peersFace.srcObject = data.stream;
  console.log("got an stream from my peer");
}
