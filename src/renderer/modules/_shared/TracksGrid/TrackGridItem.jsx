import cn from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import TextTruncate from 'react-dotdotdot';
import { Link } from 'react-router-dom';
import { Col } from 'reactstrap';
import { IMAGE_SIZES } from '../../../../shared/constants';
import { abbreviate_number, SC } from '../../../../shared/utils';
import { getReadableTime } from '../../../../shared/utils/appUtils';
import ActionsDropdown from '../ActionsDropdown';
import FallbackImage from '../FallbackImage';
import TogglePlayButton from '../TogglePlayButton';


class TrackGridItem extends React.Component {

    componentDidMount() {
        const { track, playlist, playlist_exists, fetchPlaylistIfNeededFunc } = this.props

        if (playlist && playlist_exists && track.track_count && !track.tracks) {
            fetchPlaylistIfNeededFunc(track.id)
        }
    }

    componentWillReceiveProps(nextProps) {
        const { track, fetchPlaylistIfNeededFunc } = this.props

        if (nextProps.track.id !== track.id) {

            if (nextProps.playlist && nextProps.playlist_exists && nextProps.track.track_count && !nextProps.track.tracks) {
                fetchPlaylistIfNeededFunc(nextProps.track.id)
            }
        }
    }

    shouldComponentUpdate(nextProps) {
        const { track, isPlaying } = this.props

        if (nextProps.track.id !== track.id) {
            return true
        }

        if (nextProps.isPlaying !== isPlaying) {
            return true
        }

        return false

    }

    renderArtist = () => {
        const { repost, track } = this.props

        if (repost && track.from_user) {
            return (
                <div className="trackArtist">
                    <Link to={`/user/${track.user.id}`}>
                        {
                            track.user.username
                        }
                    </Link>
                    <i className='bx bx-repost' />

                    <Link to={`/user/${track.from_user.id}`} className="repost">
                        {track.from_user.username}
                    </Link>
                </div>
            )
        }

        return (
            <div className="trackArtist">
                <Link to={`/user/${track.user.id}`}>
                    {track.user.username}
                </Link>
            </div>
        )
    }

    renderToggleButton = () => {
        const { isPlaying, playTrackFunc } = this.props

        if (isPlaying) {
            return <TogglePlayButton className="toggleButton minimal" />
        }

        const icon = isPlaying ? 'pause' : 'play_arrow'

        return (
            <a href="javascript:void(0)" className="toggleButton minimal" onClick={playTrackFunc}>
                <i className={`icon-${icon}`} />
            </a>
        )
    }

    renderStats() {
        const { track, showInfo } = this.props

        return (
            <div className="trackFooter d-flex justify-content-between align-items-center">
                <div className="trackStats">
                    {
                        showInfo ? (<div>
                            <div className="stat">
                                <i className="icon-favorite_border" />
                                <span>{abbreviate_number(track.likes_count)}</span>
                            </div>
                            <div className="stat">
                                <i className='bx bx-repost' />
                                <span>{abbreviate_number(track.reposts_count)}</span>
                            </div>
                        </div>) : null
                    }
                </div>

                <div>
                    <ActionsDropdown
                        track={track} />

                    <div className="trackTime">
                        <i className="icon-clock" />
                        <span>{getReadableTime(track.duration, true, true)}</span>
                    </div>
                </div>


            </div>
        )
    }

    renderInfo() {
        const { playlist, track } = this.props

        const object_url = (playlist ? '/playlist/' : '/track/') + track.id

        if (track.info && track.info.type.indexOf('like') !== -1) {
            return (
                <div className="trackInfo flex align-items-center">
                    <i className="icon icon-favorite" />

                    <div>
                        <div className="trackTitle">
                            <Link to={object_url}>
                                <TextTruncate clamp={1}>{track.title}</TextTruncate>
                            </Link>
                        </div>
                        {
                            this.renderArtist()
                        }
                    </div>

                </div>
            )
        }

        return (
            <div className="trackInfo">
                <div className="trackTitle">
                    <Link to={object_url}>
                        <TextTruncate
                            clamp={1}
                        >{track.title}</TextTruncate>
                    </Link>
                </div>
                {
                    this.renderArtist()
                }

            </div>
        )
    }


    render() {

        const {
            isPlaying,
            track,
            playlist
        } = this.props

        const image = SC.getImageUrl(track, IMAGE_SIZES.LARGE)

        return (
            <Col xs="12" sm="6" lg="4" className={cn('trackWrapper', {
                'playlist': playlist
            })}>
                <div className={cn(
                    'track-grid-item', track.id,
                    {
                        'isPlaying': isPlaying,
                        'playlist': playlist
                    }
                )}>

                    <div className="trackImage">
                        <div className="imageWrapper">
                            {
                                playlist ? (
                                    <div
                                        className="trackCount d-flex align-items-center justify-content-center flex-column">
                                        <span>{track.track_count}</span> <span>tracks</span>
                                    </div>
                                ) : null
                            }
                            <FallbackImage
                                id={track.id}
                                src={image} />
                            {
                                (track.streamable  || (track.policy && track.policy === "ALLOW")) || track.kind === 'playlist' ? this.renderToggleButton() : null
                            }
                        </div>

                        {
                            this.renderStats()
                        }
                        {
                            track.genre ? <a className="trackGenre">{track.genre}</a> : null
                        }

                    </div>

                    {
                        this.renderInfo()
                    }


                </div>
            </Col>
        )
    }
}

TrackGridItem.propTypes = {
    playTrackFunc: PropTypes.func.isRequired,
    isPlaying: PropTypes.bool.isRequired,
    showInfo: PropTypes.bool,
    playlist: PropTypes.bool,
    repost: PropTypes.bool,
    playlist_exists: PropTypes.bool,
    track: PropTypes.object.isRequired,
    fetchPlaylistIfNeededFunc: PropTypes.func.isRequired
}

TrackGridItem.defaultProps = {
    showInfo: false,
    playlist: false,
    repost: false,
    playlist_exists: false,
}

export default TrackGridItem
