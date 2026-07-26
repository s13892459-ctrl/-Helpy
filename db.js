const MemberData = require('../models/MemberData');
async function memberData(guildId, userId) { return MemberData.findOneAndUpdate({ guildId, userId }, { $setOnInsert: { guildId, userId } }, { new: true, upsert: true, setDefaultsOnInsert: true }); }
function countActions(data, type) { return data.actions.filter(a => a.type === type).length; }
module.exports = { memberData, countActions };
