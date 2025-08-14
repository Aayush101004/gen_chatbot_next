// --- src/app/components/BotIcon.tsx ---
import Image from 'next/image';
import React from 'react';
import botAvatar from '../../../public/chat-bot.png'; // Import the image

const BotIcon: React.FC = () => (
    <Image
        src={botAvatar}
        alt="Bot Avatar"
        width={47}
        height={47}
    />
);

export default BotIcon;
