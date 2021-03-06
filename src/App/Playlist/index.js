import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { navigate } from '@reach/router'
import { SpotifyContext } from 'Contexts/index'
import { log } from 'util/index'
import PageTitle from './PageTitle'
import Loader from 'Elements/Loader'
import LoadedPlaylist from './LoadedPlaylist'
import SelectedTrackSeeker from './SelectedTrackSeeker'
import getLoaderMessage from 'Elements/Loader/sillyExcuses'
import './Playlist.scss'

class Playlist extends Component {
  static contextType = SpotifyContext

  static propTypes = {
    id: PropTypes.string.isRequired
  }

  state = {
    loaderMessage: '',
    playlist: null,
    playback: null,
    retrievedPlayback: false,
    playbackListenerID: '',
    selectedTrack: {},
    selectedTrackPosition: '',
    isOverriding: false
  }

  componentWillMount() {
    this.setState({ loaderMessage: getLoaderMessage() })
  }

  async componentDidMount() {
    const {
      state: { spotify }
    } = this.context
    const { id } = this.props

    window.addEventListener('scroll', this.determineViewContext)

    this.setState({ spotify })

    // Frequently check for the latest playback state
    const _id = setInterval(() => this.getPlayback(spotify), 1000)
    this.setState({ playbackListenerID: _id })

    this.setPlaylist(id)
  }

  async componentDidUpdate(prevProps) {
    const { id } = this.props
    if (this.props.id !== prevProps.id) {
      this.setPlaylist(id)
    }
  }

  componentWillUnmount() {
    const { playbackListenerID } = this.state
    clearInterval(playbackListenerID)
    window.removeEventListener('scroll', this.determineViewContext)
  }

  getPlayback = async spotify => {
    const playback = await spotify.getMyCurrentPlaybackState()
    // log('trace', playback)

    // Handles race condition where async call returns an outdated track
    // TODO : refactor these alongside `overrideUI...` methods
    const { playback: statePlayback, selectedTrack, isOverriding } = this.state
    if (isOverriding && selectedTrack.id !== playback.item.id) return
    if (isOverriding && statePlayback.is_playing !== playback.is_playing) return
    if (isOverriding && statePlayback.shuffle_state !== playback.shuffle_state)
      return

    // Since the server-side progress (ms) will never equal the client-enforced
    // progress precisely, we'll approximate
    const playbackProgressIsDefinitelyOff =
      selectedTrack.id === playback.item.id &&
      Math.abs(
        (statePlayback && statePlayback.progress_ms) -
          (playback && playback.progress_ms)
      ) > 5000
    if (isOverriding && playbackProgressIsDefinitelyOff) return

    this.setState({
      playback,
      selectedTrack: playback.item || {},
      isOverriding: false,
      retrievedPlayback: true
    })
  }

  getPlaylist = async (spotify, playlistID) =>
    await spotify.getPlaylist(playlistID)

  setPlaylist = async id => {
    const {
      state: { spotify }
    } = this.context
    const playlist = await this.getPlaylist(spotify, id)
    playlist.tracks.items = playlist.tracks.items.filter(t => t.track)
    log('info', `retrieved playlist: ${playlist.id}`, playlist)
    this.setState({ playlist })
    return
  }

  toggleShuffle = () => {
    const {
      state: { spotify }
    } = this.context
    const { playback } = this.state
    spotify.setShuffle(!playback.shuffle_state)
    this.overrideUIShuffle()
  }

  determineViewContext = () => {
    const {
      state: { selectedTrackNode }
    } = this.context
    if (selectedTrackNode) {
      const bounds = selectedTrackNode.getBoundingClientRect()
      let relativeTo = 'within'
      if (bounds.top > window.innerHeight) relativeTo = 'below'
      else if (bounds.bottom < 0) relativeTo = 'above'
      this.setState({ selectedTrackPosition: `${relativeTo}_viewport` })
    }
  }

  // Allows instant UI response for active track display;
  // otherwise there would be an ugly delay between track
  // selection and visual activation
  overrideUISelectedTrack = (track, progressMs = 0) => {
    const { playback } = this.state
    this.setState({
      playback: {
        ...playback,
        item: track,
        is_playing: true,
        progress_ms: progressMs
      },
      selectedTrack: track,
      isOverriding: true
    })
  }

  overrideUISeek = progressMs => {
    const { spotify, playback } = this.state
    log('trace', `seeking to: ${progressMs}`)
    spotify.seek(progressMs)
    this.setState({
      playback: {
        ...playback,
        // Artificially add a second to account for server response time;
        // otherwise it is often the case that the track progress will
        // jump by 2 seconds
        progress_ms: progressMs + 1000
      },
      isOverriding: true
    })
  }

  overrideUIPlaying = () => {
    const { playback } = this.state
    this.setState({
      playback: {
        ...playback,
        is_playing: true
      },
      isOverriding: true
    })
  }

  overrideUIPaused = () => {
    const { playback } = this.state
    this.setState({
      playback: {
        ...playback,
        is_playing: false
      },
      isOverriding: true
    })
  }

  overrideUIShuffle = () => {
    const { playback } = this.state
    this.setState({
      playback: {
        ...playback,
        shuffle_state: !playback.shuffle_state
      },
      isOverriding: true
    })
  }

  logoutUser = async () => {
    const { dispatch } = this.context
    await navigate('/login')
    dispatch({ type: 'teardown' })
  }

  render() {
    const { state } = this.context
    const { location } = this.props
    const {
      loaderMessage,
      playlist,
      playback,
      retrievedPlayback,
      selectedTrack,
      selectedTrackPosition
    } = this.state

    const loaded = playlist && retrievedPlayback
    const currentTrackID = selectedTrack.id
    const currentTrackTitle = selectedTrack.name
    const progressMs = playback && playback.progress_ms

    return (
      <div className='playlist-container'>
        <PageTitle title={currentTrackTitle} />

        {loaded ? (
          <>
            <LoadedPlaylist
              location={location}
              spotify={state.spotify}
              playlist={playlist}
              playback={playback}
              isShuffleActive={playback.shuffle_state || false}
              currentTrackID={currentTrackID || ''}
              progressMs={progressMs || 0}
              overrideUISelectedTrack={this.overrideUISelectedTrack}
              overrideUISeek={this.overrideUISeek}
              overrideUIPlaying={this.overrideUIPlaying}
              overrideUIPaused={this.overrideUIPaused}
              overrideUIShuffle={this.toggleShuffle}
              selectedTrackPosition={selectedTrackPosition}
              locateSelectedTrack={state.scrollToSelectedTrack}
              logoutUser={this.logoutUser}
            />
            <SelectedTrackSeeker
              selectedTrackPosition={selectedTrackPosition}
              locateSelectedTrack={state.scrollToSelectedTrack}
            />
          </>
        ) : (
          <Loader message={loaderMessage} />
        )}
      </div>
    )
  }
}

export default Playlist
