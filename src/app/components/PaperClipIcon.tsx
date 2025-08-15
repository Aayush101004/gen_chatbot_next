import Image from 'next/image';
import React from 'react';
import uploadAvatar from '../../../public/upload.png'; // Import the image

const PaperClipIcon: React.FC = () => (
    <Image
        src={uploadAvatar}
        alt="Upload Avatar"
        width={28}
        height={27}
    />
);

export default PaperClipIcon;
