"use client";

import React, { useRef, useEffect, useState, ReactNode } from 'react';

interface ScaledSlideWrapperProps {
    children: ReactNode;
    baseWidth?: number;
    baseHeight?: number;
}

const ScaledSlideWrapper: React.FC<ScaledSlideWrapperProps> = ({
    children,
    baseWidth = 1280,
    baseHeight = 720,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (!containerRef.current) return;

        const updateScale = () => {
            if (!containerRef.current) return;
            const parentWidth = containerRef.current.parentElement?.clientWidth || baseWidth;
            const newScale = Math.min(parentWidth / baseWidth, 1); // Never scale up beyond 1
            setScale(newScale);
        };

        // Initial calculation
        updateScale();

        // Listen for resize
        const resizeObserver = new ResizeObserver(updateScale);
        if (containerRef.current.parentElement) {
            resizeObserver.observe(containerRef.current.parentElement);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [baseWidth]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: baseHeight * scale,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
            }}
        >
            <div
                style={{
                    width: baseWidth,
                    height: baseHeight,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                }}
            >
                {children}
            </div>
        </div>
    );
};

export default ScaledSlideWrapper;
