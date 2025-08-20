import { useId, useState, cloneElement } from 'react';

export default function Tooltip({ label, children, position = 'top' }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  const positions = {
    top: 'bottom-full mb-1 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-1 left-1/2 -translate-x-1/2',
    left: 'right-full mr-1 top-1/2 -translate-y-1/2',
    right: 'left-full ml-1 top-1/2 -translate-y-1/2',
  };

  const triggerProps = {
    'aria-describedby': open ? id : undefined,
    onMouseEnter: (e) => { setOpen(true); children.props?.onMouseEnter?.(e); },
    onMouseLeave: (e) => { setOpen(false); children.props?.onMouseLeave?.(e); },
    onFocus: (e) => { setOpen(true); children.props?.onFocus?.(e); },
    onBlur: (e) => { setOpen(false); children.props?.onBlur?.(e); },
  };

  const trigger = typeof children === 'string' || typeof children === 'number'
    ? <span tabIndex={0}>{children}</span>
    : cloneElement(children, { tabIndex: children.props?.tabIndex ?? 0, ...triggerProps });

  return (
    <span className="relative inline-block">
      {trigger}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute whitespace-nowrap rounded bg-slate-800 text-white text-xs px-2 py-1 shadow ${positions[position]} ${open ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
        aria-hidden={!open}
      >
        {label}
      </span>
    </span>
  );
}
