import React from "react";

const QUEUES = [
    { key: "urgent", label: "Urgente" },
    { key: "review", label: "Revisão" },
    { key: "spam",   label: "Spam" },
    { key: "appeal", label: "Apelos" },
];

export function ModerationQueues({ queues = {}, onJump }) {
    return (
        <div className="ops-queue-quad">
            {QUEUES.map((q) => (
                <button
                    key={q.key}
                    type="button"
                    className={`ops-queue-cell ops-queue-cell--${q.key}`}
                    style={{ textAlign: "left", cursor: onJump ? "pointer" : "default" }}
                    onClick={() => onJump && onJump(q.key)}
                >
                    <div className="ops-queue-cell__label">
                        <span className="ops-queue-cell__label-dot" />
                        {q.label}
                    </div>
                    <div className="ops-queue-cell__value">{Number(queues[q.key] || 0).toLocaleString("pt-PT")}</div>
                </button>
            ))}
        </div>
    );
}

export default ModerationQueues;
