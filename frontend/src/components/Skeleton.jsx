import React from 'react';

const SkeletonCard = () => {
    return (
        <div className="skeleton-card">
            <div className="card-header">
                <div className="skeleton skeleton-title"></div>
                <div className="skeleton" style={{ width: '60px', height: '24px', borderRadius: '999px' }}></div>
            </div>
            <div className="skeleton skeleton-small"></div>
            <div className="rating-row" style={{ marginTop: '0.5rem' }}>
                <div className="skeleton" style={{ width: '100px', height: '14px' }}></div>
            </div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="action-buttons">
                <div className="skeleton skeleton-btn"></div>
                <div className="skeleton skeleton-btn"></div>
            </div>
        </div>
    );
};

const Skeleton = ({ count = 3 }) => {
    return (
        <div className="skeleton-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
};

export default Skeleton;
