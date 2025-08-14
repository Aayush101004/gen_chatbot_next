import Image from 'next/image';
import micAvatar from '../../../public/mic.png';
import React from 'react';

interface MicIconProps {
    isRecording: boolean;
}

const MicIcon: React.FC<MicIconProps> = ({ isRecording }) => (
    <Image
        src={micAvatar}
        alt="Mic Avatar"
        width={27}
        height={27}
        className={isRecording ? "text-red-500" : "text-white"}
    />
);

export default MicIcon;
