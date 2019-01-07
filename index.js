const Urrl = require("urrl")
const TwitchExt = require("twitchext")

const TWITCH_USER_URL = new Urrl("https://api.twitch.tv/kraken/users/{userId}")
const TWITCH_CHANNEL_URL = new Urrl("https://api.twitch.tv/kraken/channels/{channelId}")

const query = require("query-string").parse(location.search)

// The "mount" is a single enum of the many many locations your
// extension might be rendered. This aggregates a bunch of different
// conditional values, including the anchor, the mode and the platform.
// https://dev.twitch.tv/docs/extensions/reference#client-query-parameters
let mount = "none"
if(query.platform === "mobile") {
    mount = "mobile"
} else if(query.popout === "true") {
    mount = "popout"
} else if(query.mode === "dashboard") {
    mount = "dashboard"
} else if(query.mode === "config") {
    mount = "config"
} else if(query.anchor === "panel") {
    mount = "panel"
} else if(query.anchor === "video_overlay") {
    mount = "overlay"
} else if(query.anchor === "component") {
    mount = "overlay-component"
}

const LANGUAGE_TO_LOCALE = {
    "en": "en-US",
    "en-gb": "en-US",
    "fr": "fr-FR",
    "it": "it-IT",
    "de": "de-DE",
    "es": "es-ES",
    "es-mx": "es-ES",
    "ja": "ja-JP",
    "ru": "ru-RU",
}

const Twitch = module.exports = {
    "viewer": {
        "token": undefined,
        "userId": undefined,
        "opaqueUserId": undefined,
        "role": undefined,
        "isBroadcaster": undefined,
        "isLurker": undefined,
        "name": undefined,
        "logo": undefined,
        "theme": undefined,
    },
    "broadcaster": {
        "channelId": undefined,
        "name": undefined,
        "logo": undefined,
    },
    "extension": {
        "mount": mount,
        "mode": query.mode || "none",
        "state": query.state || "none",
        "anchor": query.anchor || "none",
        "platform": query.platform || "none",
        "popout": query.popout || "false",
        "language": query.language || "en",
        "locale": LANGUAGE_TO_LOCALE[query.language] || "en-US",
        "clientId": undefined,
        "isHighlighted": undefined,
        "position": undefined,
    },
    "stream": {
        "game": undefined,
        "language": undefined,
        "isFullScreen": undefined,
        "isTheatreMode": undefined,
        "arePlayerControlsVisible": undefined,
        "playbackMode": undefined,
        "isMuted": undefined,
        "isPaused": undefined,
        "volume": undefined,
        "bitrate": undefined,
        "displayResolution": undefined,
        "bufferSize": undefined,
        "videoResolution": undefined,
        "hlsLatencyBroadcaster": undefined,
        "hostingInfo": undefined,
    },
    "isPopulated": false,
}

// Nimble.Twitch.retrieveTwitchChannel
// @param: <String> channelId
// @param: <String> clientId
Twitch.retrieveTwitchChannel = function(channelId) {
    return window.fetch(TWITCH_CHANNEL_URL({
        "channelId": channelId
    }), {
        "method": "GET",
        "headers": {
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": Twitch.extension.clientId
        }
    }).then((resp) => {
        return resp.json()
    })
}

// Nimble.Twitch.retrieveTwitchUser
// @param: <String> userId
// @param: <String> clientId
Twitch.retrieveTwitchUser = function(userId) {
    if(userId === undefined) {
        return Promise.resolve(undefined)
    }
    return window.fetch(TWITCH_USER_URL({
        "userId": userId
    }), {
        "method": "GET",
        "headers": {
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": Twitch.extension.clientId
        }
    }).then((resp) => {
        return resp.json()
    })
}

TwitchExt.onAuthorized(function(authorization) {
    let payload = JSON.parse(window.atob(authorization.token.split(".")[1]))

    Twitch.broadcaster.channelId = authorization.channelId

    Twitch.viewer.token = authorization.token
    Twitch.viewer.userId = payload.user_id
    Twitch.viewer.opaqueUserId = payload.opaque_user_id
    Twitch.viewer.role = payload.role
    Twitch.viewer.isBroadcaster = (Twitch.viewer.userId === Twitch.broadcaster.channelId)
    Twitch.viewer.isLurker = (Twitch.viewer.opaqueUserId[0] === "A")

    Twitch.extension.clientId = authorization.clientId

    return Promise.all([
        Twitch.retrieveTwitchChannel(authorization.channelId).then((channel) => {
            if(channel !== undefined) {
                Twitch.broadcaster.name = channel.name
                Twitch.broadcaster.logo = channel.logo
            }
        }),
        Twitch.retrieveTwitchUser(Twitch.viewer.userId).then((user) => {
            if(user !== undefined) {
                Twitch.viewer.name = user.name
                Twitch.viewer.logo = user.logo
            }
        })
    ]).then((values) => {
        Twitch.isPopulated = true
    })
})

TwitchExt.onContext(function(context) {
    Twitch.viewer.theme = context.theme

    Twitch.stream.game = context.game
    Twitch.stream.language = context.language

    Twitch.stream.isFullScreen = context.isFullScreen
    Twitch.stream.isTheatreMode = context.isTheatreMode
    Twitch.stream.arePlayerControlsVisible = context.arePlayerControlsVisible
    Twitch.stream.playbackMode = context.playbackMode

    Twitch.stream.isMuted = context.isMuted
    Twitch.stream.isPaused = context.isPaused
    Twitch.stream.volume = context.volume

    Twitch.stream.displayResolution = context.displayResolution

    Twitch.stream.bitrate = context.bitrate
    Twitch.stream.bufferSize = context.bufferSize
    Twitch.stream.videoResolution = context.videoResolution
    Twitch.stream.hlsLatencyBroadcaster = context.hlsLatencyBroadcaster

    Twitch.stream.hostingInfo = context.hostingInfo
})

TwitchExt.onHighlightChanged(function(isHighlighted) {
    Twitch.extension.isHighlighted = isHighlighted
})

TwitchExt.onPositionChanged(function(position) {
    Twitch.extension.position = position
})

TwitchExt.onVisibilityChanged(function(isVisible, context) {
    Twitch.extension.isVisible = isVisible
})
