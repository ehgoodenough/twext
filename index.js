const Urrl = require("urrl")
const TwitchExt = require("twitchext")
const FetchQuest = require("fetchquest")

const TWITCH_USER_URL = new Urrl("https://api.twitch.tv/kraken/users/{userId}")
const TWITCH_CHANNEL_URL = new Urrl("https://api.twitch.tv/kraken/channels/{channelId}")
const TWITCH_BADGES_URL = new Urrl("https://api.twitch.tv/kraken/users/{userId}/chat/channels/{channelId}?api_version=5")
const TWITCH_FOLLOWS_URL = new Urrl("https://api.twitch.tv/helix/users/follows?from_id={userId}&to_id={channelId}")

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

const Twext = module.exports = TwitchExt

Twext.viewer = {
    "token": undefined,
    "userId": undefined,
    "opaqueUserId": undefined,
    "role": undefined,
    "isBroadcaster": undefined,
    "isSubscriber": undefined,
    "isFollower": undefined,
    "isLurker": undefined,
    "name": undefined,
    "logo": undefined,
    "theme": undefined,
    "configuration": undefined,
    "configure": configure("viewer")
}
Twext.broadcaster = {
    "channelId": undefined,
    "name": undefined,
    "logo": undefined,
    "configuration": undefined,
    "configure": configure("broadcaster")
}
Twext.developer = {
    "configuration": undefined,
    "configure": configure("developer")
}
Twext.extension = {
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
}
Twext.stream = {
    // Broadcaster-controlled:
    "game": undefined,
    "language": undefined,
    "hostingInfo": undefined,
    "displayResolution": undefined,
    // Viewer-controlled:
    "isFullScreen": undefined,
    "isTheatreMode": undefined,
    "arePlayerControlsVisible": undefined,
    "playbackMode": undefined,
    "isMuted": undefined,
    "isPaused": undefined,
    "volume": undefined,
    "bitrate": undefined,
    "videoResolution": undefined,
    "bufferSize": undefined,
    "hlsLatencyBroadcaster": undefined,
}
Twext.isPopulated =  false

function configure(segment) {
    return function(content) {
        Twext.configuration.set(segment, "0.0.1", JSON.stringify(content))
    }
}

// Twext.retrieveTwitchChannel
// @param: <String> channelId
Twext.retrieveTwitchChannel = function(channelId) {
    return new FetchQuest({
        "url": TWITCH_CHANNEL_URL({"channelId": channelId})
        "method": "GET",
        "headers": {
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": Twext.extension.clientId
        }
    })
}

// Twext.retrieveTwitchUser
// @param: <String> userId
Twext.retrieveTwitchUser = function(userId) {
    if(userId === undefined) {
        return Promise.resolve(undefined)
    }
    return new FetchQuest({
        "url": TWITCH_USER_URL({"userId": userId}),
        "method": "GET",
        "headers": {
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": Twext.extension.clientId
        }
    })
}

// Twext.retrieveTwitchUserBadges
// @param: <String> userId
// @param: <String> channelId
Twext.retrieveTwitchUserBadges = function(userId, channelId) {
    return new FetchQuest({
        "url": TWITCH_BADGES_URL({"userId": userId, "channelId": channelId}),
        "method": "GET",
        "headers": {
            "Content-Type": "application/json",
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": Twext.extension.clientId,
        }
    })
}

// Twext.retrieveTwitchUserFollows
// @param: <String> userId
// @param: <String> channelId
Twext.retrieveTwitchUserFollows = function(userId, channelId) {
    return new FetchQuest({
        "url": TWITCH_FOLLOWS_URL({"userId": userId, "channelId": channelId}),
        "method": "GET",
        "headers": {
            "Content-Type": "application/json",
            "Accept": "application/vnd.twitchtv.v5+json",
            "Client-ID": Twext.extension.clientId,
        }
    })
}

Twext.onAuthorized(function(authorization) {
    let payload = JSON.parse(window.atob(authorization.token.split(".")[1]))

    Twext.broadcaster.channelId = authorization.channelId

    Twext.viewer.token = authorization.token
    Twext.viewer.userId = payload.user_id
    Twext.viewer.opaqueUserId = payload.opaque_user_id
    Twext.viewer.role = payload.role
    Twext.viewer.isBroadcaster = (Twext.viewer.userId === Twext.broadcaster.channelId) // TODO: Consider using Twext.viewer.role
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
        }),
        Twext.retrieveTwitchUserBadges(Twext.viewer.userId, Twext.broadcaster.channelId).then((response) => {
            Twext.viewer.color = response.color
            Twext.viewer.badges = response.badges || []
            Twext.viewer.badges.forEach((badge) => {
                if(badge.id === "subscriber") {
                    Twext.viewer.isSubscriber = true
                }
            })
        }),
        Twext.retrieveTwitchUserFollows(Twext.viewer.userId, Twext.broadcaster.channelId).then((response) => {
            Twext.viewer.isFollower = (response.total > 0)
        })
    ]).then((values) => {
        Twext.isPopulated = true
    })
})

Twext.onContext(function(context) {
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

Twext.onHighlightChanged(function(isHighlighted) {
    Twext.extension.isHighlighted = isHighlighted
})

Twext.onPositionChanged(function(position) {
    Twext.extension.position = position
})

Twext.onVisibilityChanged(function(isVisible, context) {
    Twext.extension.isVisible = isVisible
})

Twext.configuration.onChanged(function() {
    ["broadcaster", "viewer", "developer"].forEach((segment) => {
        if(Twext.configuration[segment] !== undefined) {
            try {
                Twext[segment].configuration = JSON.parse(Twext.configuration[segment].content)
            } catch(error) {
                console.log(error)
            }
        }
    })
})
