"use client";
import React, {useState} from 'react';

function Form() {
    // State to hold the input value
    const [inputValue, setInputValue] = useState('');

    // Function to update the state based on input changes
    const handleInputChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
        setInputValue(event.target.value);
    };

    return (
        <div>
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
            />
            <p>You typed: {inputValue}</p>
        </div>
    );
}

export default Form;