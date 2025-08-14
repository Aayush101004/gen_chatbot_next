import Image from 'next/image';
import React from 'react';
import sendAvatar from '../../../public/send.png'; // Import the image

const SendIcon: React.FC = () => (
    <Image
        src={sendAvatar}
        alt="Send Avatar"
        width={27}
        height={27}
    />
);

export default SendIcon;
