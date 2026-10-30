'use strict';
// When explicitly enabled for an adult-only release, reject child/mixed rooms
// at the trusted backend boundary, even when the client is tampered with.
const adultPilotOnly = (env=process.env) => env.CHESSY_ADULT_PILOT_ONLY === 'true';
const allowsAdultRoom = (audience,env=process.env) =>
  !adultPilotOnly(env) || audience === 'adults';
const allowsAdultEnrollment = (audience,ageBand,env=process.env) =>
  !adultPilotOnly(env) || (audience === 'adults' && ageBand === 'adult');
module.exports = {adultPilotOnly,allowsAdultRoom,allowsAdultEnrollment};
