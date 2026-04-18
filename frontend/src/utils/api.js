import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export const predictMatch = (payload) => API.post('/predict', payload);
export const fetchTeams = () => API.get('/teams');
export const fetchTeamStats = (name) => API.get(`/team-stats/${encodeURIComponent(name)}`);
export const fetchPlayers = (type = 'batting') => API.get(`/player-stats?type=${type}`);
export const fetchHeadToHead = (team1, team2) => API.get(`/head-to-head?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`);
export const fetchVenueStats = () => API.get('/venue-stats');
export const fetchRecentMatches = (limit = 20) => API.get(`/recent-matches?limit=${limit}`);
export const fetchLeaderboard = () => API.get('/leaderboard');
export const fetchSeasonPerformance = (team) => API.get(`/season-performance${team ? `?team=${encodeURIComponent(team)}` : ''}`);

export default API;
