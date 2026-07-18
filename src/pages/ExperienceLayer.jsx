// ExperienceLayer - Rally's answer to Agentforce Experience Layer: deploy an
// agent once and render it anywhere (in-app, Slack, Teams, web widget, embed,
// API). Placeholder shell; the build fleet fleshes this out. NO em-dash.
import React from 'react';
import { SectionHeader } from '../components/UI.jsx';

export default function ExperienceLayer() {
  return (
    <div className="fade-up">
      <SectionHeader title="Experience Layer" sub="Build an agent once, deploy it everywhere your customers and team already are. Coming online." />
    </div>
  );
}
