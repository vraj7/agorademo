let client;
let localTrack;
let remoteTrack;
let localUid;
let localAudioTrack;
let remoteAudioTrack;

// --- Player Controls ---
let isAudioMuted = false;
let isVideoMuted = false;
let isScreenSharing = false;
let originalVideoTrack = null;

const joinBtn = document.getElementById('join');
const leaveBtn = document.getElementById('leave');
const muteAudioBtn = document.getElementById('mute-audio');
const muteVideoBtn = document.getElementById('mute-video');
const screenShareBtn = document.getElementById('screen-share');
const resizePlayerBtn = document.getElementById('resize-player');
const volumeSlider = document.getElementById('volume-slider');
const remotePlayer = document.getElementById('remote-player');

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
    localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    localTrack.play('local-player');
    await client.publish([localTrack, localAudioTrack]);

    // Subscribe to already-published remote users (for late joiners)
    client.remoteUsers.forEach(async (user) => {
        if (user.hasVideo) {
            await client.subscribe(user, 'video');
            remoteTrack = user.videoTrack;
            document.getElementById('remote-placeholder').style.display = 'none';
            remoteTrack.play('remote-player');
        }
        if (user.hasAudio) {
            await client.subscribe(user, 'audio');
            remoteAudioTrack = user.audioTrack;
            remoteAudioTrack.play();
            updateRemoteVolume();
        }
    });

    client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video') {
            remoteTrack = user.videoTrack;
            document.getElementById('remote-placeholder').style.display = 'none';
            remoteTrack.play('remote-player');
        }
        if (mediaType === 'audio') {
            remoteAudioTrack = user.audioTrack;
            remoteAudioTrack.play();
            updateRemoteVolume();
        }
    });
    client.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video' && remoteTrack) {
            remoteTrack.stop();
            document.getElementById('remote-player').innerHTML = '';
            document.getElementById('remote-placeholder')?.remove();
            const placeholder = document.createElement('span');
            placeholder.id = 'remote-placeholder';
            placeholder.innerHTML = `
                <span class="waiting">Waiting for the other participant to join…</span>
                <span style="font-size:1.1rem; color:#b0bec5;">Share the channel name and token with your friend to start the meeting.</span>
            `;
            document.getElementById('remote-player').appendChild(placeholder);
        }
        if (mediaType === 'audio' && remoteAudioTrack) {
            remoteAudioTrack.stop();
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
    if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack.close();
    }
    if (remoteTrack) {
        remoteTrack.stop();
        document.getElementById('remote-player').innerHTML = '';
        document.getElementById('remote-placeholder')?.remove();
        const placeholder = document.createElement('span');
        placeholder.id = 'remote-placeholder';
        placeholder.innerHTML = `
            <span class="waiting">Waiting for the other participant to join…</span>
            <span style="font-size:1.1rem; color:#b0bec5;">Share the channel name and token with your friend to start the meeting.</span>
        `;
        document.getElementById('remote-player').appendChild(placeholder);
    }
    if (remoteAudioTrack) {
        remoteAudioTrack.stop();
    }
    await client.leave();
    document.getElementById('local-player').innerHTML = '<span id="local-placeholder" style="color:#aaa;">No local video</span>';
};

// --- Player Controls ---
muteAudioBtn.onclick = () => {
    if (!localAudioTrack) return;
    isAudioMuted = !isAudioMuted;
    localAudioTrack.setEnabled(!isAudioMuted);
    muteAudioBtn.querySelector('.material-icons').textContent = isAudioMuted ? 'mic_off' : 'mic';
};

muteVideoBtn.onclick = () => {
    if (!localTrack) return;
    isVideoMuted = !isVideoMuted;
    localTrack.setEnabled(!isVideoMuted);
    muteVideoBtn.querySelector('.material-icons').textContent = isVideoMuted ? 'videocam_off' : 'videocam';
};

volumeSlider.oninput = () => {
    if (remoteAudioTrack) {
        remoteAudioTrack.setVolume(Number(volumeSlider.value));
    }
};

resizePlayerBtn.onclick = () => {
    if (remotePlayer.classList.contains('expanded')) {
        remotePlayer.classList.remove('expanded');
        remotePlayer.style.width = '';
        remotePlayer.style.height = '';
        resizePlayerBtn.querySelector('.material-icons').textContent = 'fullscreen';
    } else {
        remotePlayer.classList.add('expanded');
        remotePlayer.style.width = '98vw';
        remotePlayer.style.height = '90vh';
        resizePlayerBtn.querySelector('.material-icons').textContent = 'fullscreen_exit';
    }
};

screenShareBtn.onclick = async () => {
    if (!isScreenSharing) {
        try {
            originalVideoTrack = localTrack;
            const screenTrack = await AgoraRTC.createScreenVideoTrack();
            await client.unpublish([localTrack]);
            localTrack = screenTrack;
            await client.publish([localTrack]);
            isScreenSharing = true;
            screenShareBtn.querySelector('.material-icons').textContent = 'stop_screen_share';
        } catch (e) {
            alert('Screen sharing failed: ' + e.message);
        }
    } else {
        if (originalVideoTrack) {
            await client.unpublish([localTrack]);
            localTrack = originalVideoTrack;
            await client.publish([localTrack]);
            isScreenSharing = false;
            screenShareBtn.querySelector('.material-icons').textContent = 'screen_share';
        }
    }
};

// Update remote audio volume when new track is received
function updateRemoteVolume() {
    if (remoteAudioTrack) {
        remoteAudioTrack.setVolume(Number(volumeSlider.value));
    }
}

//37f3f5c76e184368a99d3bca53736157
//007eJxTYLiXZ7/LVEkl83LkiwkRPmGZOa7R52YcefOQu7YoUcuS574Cg7F5mnGaabK5WaqhhYmxmUWipWWKcVJyoqmxubGZoak5p6drRkMgIwNPbQgLIwMEgvjsDCWpxSWJSckMDAArbR3Y
