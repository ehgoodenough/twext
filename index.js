const Urrl = require("urrl")
const TwitchExt = require("twitchext")

const TWITCH_USER_URL = new Urrl("https://api.Twext.tv/kraken/users/{userId}")
const TWITCH_CHANNEL_URL = new Urrl("https://api.Twext.tv/kraken/channels/{channelId}")

const query = require("query-string").parse(location.search)

// The "mount" is a single enum of the many many locations your
// extension might be rendered. This aggregates a bunch of different
// conditional values, including the anchor, the mode and the platform.
// https://dev.Twext.tv/docs/extensions/reference#client-query-parameters
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

const Twext = module.exports = {
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

// Nimble.Twext.retrieveTwitchChannel
// @param: <String> channelId
// @param: <String> clientId
Twext.retrieveTwitchChannel = function(channelId) {
    return window.fetch(TWITCH_CHANNEL_URL({
        "channelId": channelId
    }), {
        "method": "GET",
        "headers": {
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": Twext.extension.clientId
        }
    }).then((resp) => {
        return resp.json()
    })
}

// Nimble.Twext.retrieveTwitchUser
// @param: <String> userId
// @param: <String> clientId
Twext.retrieveTwitchUser = function(userId) {
    if(userId === undefined) {
        return Promise.resolve(undefined)
    }
    return window.fetch(TWITCH_USER_URL({
        "userId": userId
    }), {
        "method": "GET",
        "headers": {
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": Twext.extension.clientId
        }
    }).then((resp) => {
        return resp.json()
    })
}

TwitchExt.onAuthorized(function(authorization) {
    let payload = JSON.parse(window.atob(authorization.token.split(".")[1]))

    Twext.broadcaster.channelId = authorization.channelId

    Twext.viewer.token = authorization.token
    Twext.viewer.userId = payload.user_id
    Twext.viewer.opaqueUserId = payload.opaque_user_id
    Twext.viewer.role = payload.role
    Twext.viewer.isBroadcaster = (Twext.viewer.userId === Twext.broadcaster.channelId)
    Twext.viewer.isLurker = (Twext.viewer.opaqueUserId[0] === "A")

    Twext.extension.clientId = authorization.clientId

    return Promise.all([
        Twext.retrieveTwitchChannel(authorization.channelId).then((channel) => {
            if(channel !== undefined) {
                Twext.broadcaster.name = channel.name
                Twext.broadcaster.logo = channel.logo
            }
        }),
        Twext.retrieveTwitchUser(Twext.viewer.userId).then((user) => {
            if(user !== undefined) {
                Twext.viewer.name = user.name
                Twext.viewer.logo = user.logo
            }
        })
    ]).then((values) => {
        Twext.isPopulated = true
    })
})

TwitchExt.onContext(function(context) {
    Twext.viewer.theme = context.theme

    Twext.stream.game = context.game
    Twext.stream.language = context.language

    Twext.stream.isFullScreen = context.isFullScreen
    Twext.stream.isTheatreMode = context.isTheatreMode
    Twext.stream.arePlayerControlsVisible = context.arePlayerControlsVisible
    Twext.stream.playbackMode = context.playbackMode

    Twext.stream.isMuted = context.isMuted
    Twext.stream.isPaused = context.isPaused
    Twext.stream.volume = context.volume

    Twext.stream.displayResolution = context.displayResolution

    Twext.stream.bitrate = context.bitrate
    Twext.stream.bufferSize = context.bufferSize
    Twext.stream.videoResolution = context.videoResolution
    Twext.stream.hlsLatencyBroadcaster = context.hlsLatencyBroadcaster

    Twext.stream.hostingInfo = context.hostingInfo
})

TwitchExt.onHighlightChanged(function(isHighlighted) {
    Twext.extension.isHighlighted = isHighlighted
})

TwitchExt.onPositionChanged(function(position) {
    Twext.extension.position = position
})

TwitchExt.onVisibilityChanged(function(isVisible, context) {
    Twext.extension.isVisible = isVisible
})
