import React, { useState } from "react";
import styled from "styled-components";

const theme = {
    blue: {
        default: "#3f51b5",
        hover: "#283593",
    },
    pink: {
        default: "#e91e63",
        hover: "#ad1457",
    },
};

const Button = styled.button`
  background-color: ${theme.blue.default};
  color: white;
  padding: 5px 15px;
  border-radius: 5px;
  outline: 0;
  border: 0; 
  text-transform: uppercase;
  margin: 10px 0px;
  cursor: pointer;
  transition: ease background-color 250ms;
  &:hover {
    background-color: ${theme.blue.hover}
    cursor: default;
    opacity: 0.7;
  }
`;
export default Button;

