// --- src/app/components/BotIcon.tsx ---
import Image from 'next/image';
import React from 'react';
import UserAvatar from '../../../public/message.png'; // Import the image

const UserIcon: React.FC = () => (
    <Image
        src={UserAvatar}
        alt="User Avatar"
        width={47}
        height={47}
    />
);

export default UserIcon;
