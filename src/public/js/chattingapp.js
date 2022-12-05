const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

const room = document.getElementById("room");
const msg = room.querySelector("#msg");
const chatRoom = document.querySelector("#chatting");

const call = document.getElementById("call");
const stream = document.querySelector("#myStream");

stream.hidden = true;
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
  chat.style.backgroundColor = "lightgreen";
  chat.style.color = "white";
  chatRoom.style.height = "75%";
  chatRoom.append(chat);
  chatRoom.style.overflow = "auto";
}

function handlemessage(event) {
  event.preventDefault();
  const input = room.querySelector("#msg input");
  myDataChannel.send(input.value);
  const chat = document.createElement("li");
  chat.innerText = input.value;
  chatRoom.append(chat);
  chatRoom.style.overflow = "auto";

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
    muteBtn.innerText = "Mute";
    muted = true;
  } else {
    muteBtn.innerText = "Unmute";
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
const welcome = document.querySelector("#welcome");
const welcomeForm = welcome.querySelector("form");
const videoCall = document.getElementById("videoCall");
const ChatappFrame = document.querySelector("#Chatapp");
const mediaQuery = window.matchMedia("(max-width: 768px)");
const options = document.querySelector("#options");
videoCall.addEventListener("click", handleVideochat);

async function handleVideochat() {
  if (call.hidden) {
    ChatappFrame.style.width = "968px";
    if (mediaQuery.matches) {
      // Then trigger an alert
      ChatappFrame.style.width = "732px";
      ChatappFrame.style.height = "968px";
    }
    options.style.zIndex = "1";
    chatRoom.hidden = true;
    call.hidden = false;
    msg.hidden = true;
  } else {
    msg.hidden = false;
    chatRoom.hidden = false;
    call.hidden = true;
    myStream.getTracks().forEach((track) => track.stop());
    partnerStream.getTracks().forEach((track) => track.stop());
  }
}

async function handleWelcomeSubmit(event) {
  event.preventDefault();
  stream.hidden = false;
  const input = welcomeForm.querySelector("input");
  const h2 = document.querySelector("#intro");
  welcome.classList.add("hidden");
  h2.hidden = true;
  room.hidden = false;
  await getMedia();
  myStream.getAudioTracks().forEach((track) => (track.enabled = false));
  makeConnection();
  socket.emit("join_room", input.value);
  roomName = input.value;
  input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);

// Socket Code
function inNout(users) {
  const li = document.createElement("li");
  li.innerText = users;
  chatRoom.append(li);
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

socket.on("offer", async (offer, roomName, newCount) => {
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
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
socket.on("room_change", (rooms) => {
  const roomList = welcome.querySelector("ul");
  roomList.innerText = "";
  if (rooms.length === 0) {
    return;
  }
  rooms.forEach((room) => {
    const li = document.createElement("li");
    li.innerText = room;
    roomList.append(li);
    roomList.style.height = "150px";
    roomList.style.overflow = "auto";
  });
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
