// --- src/app/components/BotIcon.tsx ---
import Image from 'next/image';
import React from 'react';
import botAvatar from '../../../public/diamond.png'; // Import the image

const BotIcon: React.FC = () => (
    <Image
        src={botAvatar}
        alt="Bot Avatar"
        width={32}
        height={32}
    />
);

export default BotIcon;
