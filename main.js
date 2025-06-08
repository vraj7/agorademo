let client;
let localTrack;
let remoteTrack;
let localUid;

const joinBtn = document.getElementById('join');
const leaveBtn = document.getElementById('leave');

joinBtn.onclick = async () => {
    const appid = document.getElementById('appid').value.trim();
    const channel = document.getElementById('channel').value.trim();
    const token = document.getElementById('token').value.trim();
    if (!appid || !channel) {
        alert('Please enter App ID and Channel Name');
        return;
    }
    joinBtn.disabled = true;
    leaveBtn.disabled = false;

    client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    await client.join(appid, channel, token || null, null).then(uid => { localUid = uid; });

    localTrack = await AgoraRTC.createCameraVideoTrack();
    document.getElementById('local-placeholder').style.display = 'none';
    localTrack.play('local-player');
    await client.publish([localTrack]);

    // Subscribe to already-published remote users (for late joiners)
    client.remoteUsers.forEach(async (user) => {
        if (user.hasVideo) {
            await client.subscribe(user, 'video');
            remoteTrack = user.videoTrack;
            document.getElementById('remote-placeholder').style.display = 'none';
            remoteTrack.play('remote-player');
        }
    });

    client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
            remoteTrack = user.videoTrack;
            document.getElementById('remote-placeholder').style.display = 'none';
            remoteTrack.play('remote-player');
        }
    });
    client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video' && remoteTrack) {
            remoteTrack.stop();
            document.getElementById('remote-player').innerHTML = '<span id="remote-placeholder" style="color:#aaa;">No remote video</span>';
        }
    });
};

leaveBtn.onclick = async () => {
    leaveBtn.disabled = true;
    joinBtn.disabled = false;
    if (localTrack) {
        localTrack.stop();
        localTrack.close();
    }
    if (remoteTrack) {
        remoteTrack.stop();
        document.getElementById('remote-player').innerHTML = '<span id="remote-placeholder" style="color:#aaa;">No remote video</span>';
    }
    await client.leave();
    document.getElementById('local-player').innerHTML = '<span id="local-placeholder" style="color:#aaa;">No local video</span>';
}; 
//37f3f5c76e184368a99d3bca53736157
//007eJxTYLiXZ7/LVEkl83LkiwkRPmGZOa7R52YcefOQu7YoUcuS574Cg7F5mnGaabK5WaqhhYmxmUWipWWKcVJyoqmxubGZoak5p6drRkMgIwNPbQgLIwMEgvjsDCWpxSWJSckMDAArbR3Y
