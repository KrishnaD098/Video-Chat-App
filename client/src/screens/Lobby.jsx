import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import styled from "styled-components";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { email, room } = data;
      navigate(`/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <Container>
      <Title>Join a Room</Title>
      <Form onSubmit={handleSubmitForm}>
        <Label htmlFor="email">Email ID</Label>
        <Input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <Label htmlFor="room">Room Number</Label>
        <Input
          type="text"
          id="room"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="Enter room number"
        />
        <Button type="submit">Join Room</Button>
      </Form>
    </Container>
  );
};

export default LobbyScreen;

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #2e2e38, #3e3e47);
  color: white;
`;

const Title = styled.h1`
  margin-bottom: 2rem;
  font-size: 2.5rem;
  color: #61dafb;
`;

const Form = styled.form`
  background: #282c34;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  width: 300px;
`;

const Label = styled.label`
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
`;

const Input = styled.input`
  margin-bottom: 1.5rem;
  padding: 0.8rem;
  font-size: 1rem;
  border: none;
  border-radius: 5px;
  outline: none;
  background-color: #3a3f47;
  color: #fff;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const Button = styled.button`
  background-color: #61dafb;
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 5px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease-in-out, transform 0.2s;

  &:hover {
    background-color: #21a1f1;
  }

  &:active {
    transform: translateY(2px);
  }
`;
