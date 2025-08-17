import Image from 'next/image';
import React from 'react';
import stopAvatar from '../../../public/stop.png'; // Import the image

const StopIcon: React.FC = () => (
    <Image
        src={stopAvatar}
        alt="Stop Avatar"
        width={27}
        height={27}
    />
);

export default StopIcon;