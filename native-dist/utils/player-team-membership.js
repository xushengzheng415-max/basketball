function text(value) {
  return String(value || '').trim();
}

function unique(values) {
  return Array.from(new Set((values || []).map(text).filter(Boolean)));
}

function teamIds(player) {
  const source = player || {};
  return unique([].concat(source.teamIds || [], source.filter && source.filter !== 'unassigned' ? [source.filter] : []));
}

function teamNames(player) {
  const source = player || {};
  return unique([].concat(source.teamNames || [], source.team && source.team !== '未分队' ? [source.team] : []));
}

function hasTeams(player) {
  return teamIds(player).length > 0 || teamNames(player).length > 0;
}

function belongsToTeam(player, team) {
  const source = team || {};
  const id = text(source.sourceTeamId || source.id || source.key);
  const name = text(source.name || source.label || source.teamName);
  return (!!id && teamIds(player).includes(id)) || (!!name && teamNames(player).includes(name));
}

function selectionFromPlayer(player, teams) {
  const ids = teamIds(player);
  const names = teamNames(player);
  return (teams || []).filter((team) => team && team.key !== 'unassigned' && (
    ids.includes(text(team.key || team.id)) || names.includes(text(team.label || team.name))
  ));
}

function membershipFields(selectedTeams) {
  const selected = (selectedTeams || []).filter((team) => team && team.key !== 'unassigned');
  const ids = unique(selected.map((team) => team.key || team.id));
  const names = unique(selected.map((team) => team.label || team.name));
  return {
    teamIds: ids,
    teamNames: names,
    filter: ids[0] || 'unassigned',
    team: names[0] || ''
  };
}

module.exports = { belongsToTeam, hasTeams, membershipFields, selectionFromPlayer, teamIds, teamNames };
