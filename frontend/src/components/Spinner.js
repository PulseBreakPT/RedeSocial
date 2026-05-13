/**
 * Tiny inline spinner — always inherits currentColor.
 * Use inside buttons for loading states.
 */
export function Spinner({ size = 14, strokeWidth = 2, className = "" }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={`inline-block animate-spin ${className}`}
            fill="none"
            aria-hidden
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                opacity="0.2"
            />
            <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
        </svg>
    );
}
