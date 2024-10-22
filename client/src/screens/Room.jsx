import React, { useEffect, useCallback, useState, useRef } from "react";
import styled from "styled-components";
import { useSocket } from "../context/SocketProvider";
import peer from "../service/peer";
import { useNavigate } from "react-router-dom"; // Use useNavigate instead of useHistory

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background-color: #1e1e1e;
  min-height: 100vh;
  color: #ffffff;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 20px;
`;

const Status = styled.h4`
  margin-bottom: 30px;
`;

const ButtonContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
`;

const Button = styled.button`
  padding: 10px 20px;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background-color: #61dafb;
  color: #000;
  transition: background-color 0.3s;

  &:hover {
    background-color: #21a1f1;
  }
`;

const StreamContainer = styled.div`
  display: flex;
  justify-content: space-between; /* Changed to space-between for side-by-side layout */
  width: 100%; /* Set width to full */
  max-width: 800px; /* Optional max-width */
  margin-top: 20px;
`;

const Video = styled.video`
  height: 300px; /* Set fixed height for videos */
  width: 45%; /* Make each video take up 45% of the width */
  border: 2px solid #61dafb; /* Optional styling */
  border-radius: 10px; /* Rounded corners for videos */
  object-fit: cover; /* Ensure videos fill the container without distortion */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); /* Added shadow for realism */
`;

const RoomPage = () => {
  const socket = useSocket();
  const navigate = useNavigate(); // Initialize navigate for navigation
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setRemoteStream] = useState();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    localVideoRef.current.srcObject = stream; // Set local video stream

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [remoteSocketId, socket]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      localVideoRef.current.srcObject = stream; // Set local video stream
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    if (myStream) {
      for (const track of myStream.getTracks()) {
        peer.peer.addTrack(track, myStream);
      }
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded]);

  const handleNegoNeedIncoming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = ev.streams[0];
      console.log("GOT TRACKS!!");
      setRemoteStream(remoteStream);
      remoteVideoRef.current.srcObject = remoteStream; // Set remote video stream
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncoming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncoming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegoNeedIncoming,
    handleNegoNeedFinal,
  ]);

  const handleEndCall = () => {
    // Check and stop local stream tracks
    if (myStream) {
      console.log("Stopping local stream tracks");
      myStream.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped track:", track);
      });
      localVideoRef.current.srcObject = null; 
    }
  
    // Check and stop remote stream tracks if applicable
    if (remoteStream) {
      console.log("Stopping remote stream tracks");
      remoteStream.getTracks().forEach(track => {
        track.stop();
        console.log("Stopped remote track:", track);
      });
      remoteVideoRef.current.srcObject = null; 
    }
  
    // Emit end call event to the server
    socket.emit("call:end", { to: remoteSocketId });
  
    // Clear all state variables
    setMyStream(null);
    setRemoteStream(null);
    setRemoteSocketId(null);
    console.log("Redirecting to homepage");
  
    // Redirect to homepage
    navigate("/"); 
  };
  

  return (
    <Container>
      <Title>Room Page</Title>
      <Status>{remoteSocketId ? "Connected" : "No one in room"}</Status>
      <ButtonContainer>
        {remoteSocketId && <Button onClick={handleCallUser}>CALL</Button>}
        <Button onClick={handleEndCall}>END CALL</Button>
      </ButtonContainer>
      <StreamContainer>
        <Video ref={localVideoRef} autoPlay muted />
        <Video ref={remoteVideoRef} autoPlay /> 
      </StreamContainer>
    </Container>
  );
};

export default RoomPage;
