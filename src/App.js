import React, { Component } from 'react';
import LoginPrompt from './LoginPrompt';
import PlaylistHeader from './PlaylistHeader';
import MediaPlayer from './MediaPlayer';
import initSpotifyClient from './spotify';
import './App.css';
import Tracklist from './Tracklist';

class App extends Component {
  state = {
    playlist: {},
    loaded: false,
    spotify: null,
    playback: null,
    activeTrack: {},
    isOverriding: false,

    loginPrompt: false,

    lastReceivedTokenDate: 0
  }

  async componentDidMount() {
    const clientParams = initSpotifyClient()
    if (!clientParams) return this.setState({ loginPrompt: true })

    const { spotify, refreshToken } = clientParams
    setInterval(this.getPlayback.bind(null, spotify), 1000)
    setInterval(() =>
      this.refreshTokenPeriodically(refreshToken, spotify)
    , 1000 * 60 * 10) // 10 minutes

    const playlist = await this.getPlaylist(spotify)
    console.log(playlist)
    const me = await spotify.getMe()
    console.log('me', me)
    this.setState({
      loaded: true,
      playlist,
      spotify,
      lastReceivedTokenDate: Date.now()
    })
  }  

  getPlayback = async spotify => {
    const playback = await spotify.getMyCurrentPlaybackState()

    // Handles race condition where async call returns an outdated track
    const { activeTrack, isOverriding } = this.state
    if (isOverriding && activeTrack.id !== playback.item.id) return

    this.setState({
      playback,
      activeTrack: playback.item,
      isOverriding: false
    })
  }

  getPlaylist = async spotify =>
    await spotify.getPlaylist('3a6kAci1fsVoCPJXltCvIv')

  
  refreshTokenPeriodically = (rToken, spotify) => {
    fetch(`/api/refresh_token?refresh_token=${rToken}`)
      .then(r => r.json())
      .then(({ access_token }) => spotify.setAccessToken(access_token))
  }

  // Allows instant UI response for active track display;
  // otherwise there would be a significant delay between
  // track selection and visual activation
  overrideActiveTrack = track => {
    const { playback } = this.state
    this.setState({
      playback: {
        ...playback,
        item: track,
        progress_ms: 0
      },
      activeTrack: track,
      isOverriding: true
    })
  }

  render() {
    const {
      playlist,
      spotify,
      playback,
      activeTrack,
      loaded,

      loginPrompt
    } = this.state

    const currentTrackId = playback && playback.item && playback.item.id
    const progressMs = playback && playback.progress_ms

    return (
      <div className='app'>
        {loginPrompt && <LoginPrompt />}

        {loaded &&
          <>
            <PlaylistHeader playlist={playlist} />
            <Tracklist
              spotify={spotify}
              playlist={playlist}
              currentTrackId={currentTrackId}
              activeTrack={activeTrack}
              progressMs={progressMs}
              overrideActiveTrack={this.overrideActiveTrack}
            />
            <MediaPlayer
              spotify={spotify}
              playback={playback}
            />
          </>
        }
      </div>
    );
  }
}

export default App;
