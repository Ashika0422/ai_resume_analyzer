import React from 'react';

interface ScoreBadgeProps {
  score: number;
}

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score }) => {
  const getBadgeStyles = () => {
    if (score > 70) {
      return {
        bgClass: 'bg-badge-green',
        textClass: 'text-green-600',
        label: 'Strong'
      };
    } else if (score > 49) {
      return {
        bgClass: 'bg-badge-yellow',
        textClass: 'text-yellow-600',
        label: 'Good Start'
      };
    } else {
      return {
        bgClass: 'bg-badge-red',
        textClass: 'text-red-600',
        label: 'Needs Work'
      };
    }
  };

  const { bgClass, textClass, label } = getBadgeStyles();

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${bgClass}`}>
      <p className={textClass}>{label}</p>
    </div>
  );
};

export default ScoreBadge;
