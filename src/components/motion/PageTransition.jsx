// PageTransition - a subtle route-mount fade-rise. Wrap a page's root in
// this and it eases up into place each time the route mounts, so moving
// between views feels composed rather than abrupt. Passes through
// className/style so it can double as the page's layout container.
// Reduced-motion safe (see motion.css). ASCII only. No em-dash / en-dash.
import React from 'react';
import './motion.css';

export default function PageTransition({ children, className = '', style, ...rest }) {
  const cls = 'pm-page' + (className ? ' ' + className : '');
  return <div className={cls} style={style} {...rest}>{children}</div>;
}
