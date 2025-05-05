// server/models/index.js
import Article from './Article.model.js';
import Scenario from './Scenario.model.js';
import SourceDocument from './SourceDocument.model.js';
import User from './User.model.js';

export default {
  Article,
  Scenario,
  SourceDocument,
  User
};

export { default as Lineup } from './Lineup.model.js';
export { default as StoryIdeas } from './StoryIdeas.model.js';
export { default as WaitlistEntry } from './WaitlistEntry.model.js';
export { default as Forecaster } from './Forecaster.model.js'; 