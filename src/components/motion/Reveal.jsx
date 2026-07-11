// Reveal - an in-app scroll reveal. Children fade + rise the first time
// they enter view. Triggers EARLY (useInView uses a positive bottom
// rootMargin) so sections are never held back or blank as you scroll.
// Optional `mountOnView` defers rendering the children until visible and
// shows a `placeholder` meanwhile - handy for charts so their own draw-in
// animation coincides with the reveal instead of firing off-screen.
// ASCII only. No em-dash / en-dash.
import React from 'react';
import { useInView } from './useInView';
import './motion.css';

export default function Reveal({
  children,
  as: As = 'div',
  delay = 0,
  y = 14,
  mountOnView = false,
  placeholder = null,
  className = '',
  style,
  ...rest
}) {
  const [ref, inView] = useInView({ once: true });
  const cls = 'pm-reveal' + (inView ? ' pm-in' : '') + (className ? ' ' + className : '');
  return (
    <As
      ref={ref}
      className={cls}
      style={{ '--pm-delay': `${delay}ms`, '--pm-y': `${y}px`, ...style }}
      {...rest}
    >
      {mountOnView ? (inView ? children : placeholder) : children}
    </As>
  );
}
