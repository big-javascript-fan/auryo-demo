import { Menu, MenuDivider, MenuItem, Popover, Position } from '@blueprintjs/core';
import cn from 'classnames';
import * as React from 'react';
import { connect, MapDispatchToProps } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { Col, Row, TabContent, TabPane } from 'reactstrap';
import { bindActionCreators } from 'redux';
import { IMAGE_SIZES } from '../../../common/constants';
import { StoreState } from '../../../common/store';
import { AuthState, toggleFollowing } from '../../../common/store/auth';
import { CombinedUserPlaylistState, getUserPlaylistsCombined } from '../../../common/store/auth/selectors';
import { getTrackEntity } from '../../../common/store/entities/selectors';
import { canFetchMoreOf, fetchMore, ObjectState, ObjectTypes, PlaylistTypes } from '../../../common/store/objects';
import { getCommentObject, getPlaylistName, getRelatedTracksPlaylistObject } from '../../../common/store/objects/selectors';
import { addUpNext, PlayerStatus, PlayingTrack, playTrack } from '../../../common/store/player';
import { togglePlaylistTrack } from '../../../common/store/playlist/playlist';
import { fetchTrackIfNeeded, toggleLike, toggleRepost } from '../../../common/store/track/actions';
import { setScrollPosition } from '../../../common/store/ui';
import { getPreviousScrollTop } from '../../../common/store/ui/selectors';
import { SC } from '../../../common/utils';
import { IPC } from '../../../common/utils/ipc';
import { NormalizedResult, SoundCloud } from '../../../types';
import Header from '../../app/components/Header/Header';
import CustomScroll from '../../_shared/CustomScroll';
import FallbackImage from '../../_shared/FallbackImage';
import PageHeader from '../../_shared/PageHeader/PageHeader';
import ShareMenuItem from '../../_shared/ShareMenuItem';
import Spinner from '../../_shared/Spinner/Spinner';
import TogglePlayButton from '../../_shared/TogglePlayButton';
import TrackList from '../../_shared/TrackList/TrackList';
import WithHeaderComponent from '../../_shared/WithHeaderComponent';
import TrackOverview from './components/TrackOverview';
import './TrackPage.scss';

interface OwnProps extends RouteComponentProps<{ songId: string }> {
}

interface PropsFromState {
    playingTrack: PlayingTrack | null;
    isRelatedPlaylistsPlaying: boolean;
    relatedPlaylistId: string;
    auth: AuthState;
    relatedTracks: ObjectState<NormalizedResult> | null;
    comments: ObjectState<NormalizedResult> | null;
    previousScrollTop?: number;
    track: SoundCloud.Track | null;
    songIdParam: number;
    userPlaylists: Array<CombinedUserPlaylistState>;
}

interface PropsFromDispatch {
    setScrollPosition: typeof setScrollPosition;
    fetchTrackIfNeeded: typeof fetchTrackIfNeeded;
    toggleRepost: typeof toggleRepost;
    fetchMore: typeof fetchMore;
    canFetchMoreOf: typeof canFetchMoreOf;
    playTrack: typeof playTrack;
    toggleFollowing: typeof toggleFollowing;
    addUpNext: typeof addUpNext;
    toggleLike: typeof toggleLike;
    togglePlaylistTrack: typeof togglePlaylistTrack;
}

interface State {
    activeTab: TabTypes;
    scrollTop: number;
}

enum TabTypes {
    OVERVIEW = 'overview',
    RELATED_TRACKS = 'related'
}

type AllProps = OwnProps & PropsFromState & PropsFromDispatch;

class TrackPage extends WithHeaderComponent<AllProps, State> {

    readonly state: State = {
        activeTab: TabTypes.OVERVIEW,
        scrollTop: 0
    };

    componentDidMount() {
        super.componentDidMount();

        const { fetchTrackIfNeeded, songIdParam } = this.props;

        fetchTrackIfNeeded(songIdParam);

    }

    componentWillReceiveProps(nextProps: AllProps) {
        const { fetchTrackIfNeeded, songIdParam } = nextProps;

        // if (songId !== nextProps.params.songId) {
        fetchTrackIfNeeded(songIdParam);
        // }
    }

    toggle = (tab: TabTypes) => {
        if (this.state.activeTab !== tab) {
            this.setState({
                activeTab: tab
            });
        }
    }

    fetchMore = () => {
        const { match: { params: { songId } }, fetchMore } = this.props;

        if (this.state.activeTab === TabTypes.OVERVIEW) {
            fetchMore(songId, ObjectTypes.COMMENTS);
        }
    }

    canFetchMore = () => {
        const { match: { params: { songId } }, canFetchMoreOf } = this.props;

        if (this.state.activeTab === TabTypes.OVERVIEW) {
            canFetchMoreOf(songId, ObjectTypes.COMMENTS);
        }

        return false;
    }

    renderToggleButton = () => {
        const { songIdParam, playTrack, relatedPlaylistId, playingTrack } = this.props;

        // TODO redundant?

        if (playingTrack && playingTrack.id !== null && (playingTrack.id === songIdParam)) {
            return (
                <TogglePlayButton
                    className='c_btn round playButton'
                />
            );
        }

        const playTrackFunc = () => {
            playTrack(relatedPlaylistId, { id: songIdParam });
        };

        return (
            <a href='javascript:void(0)' className='c_btn round playButton' onClick={playTrackFunc}>
                <i className='bx bx-play' />
            </a>
        );
    }

    render() {
        const {
            // Vars
            auth: { likes, reposts },
            relatedPlaylistId,
            comments,
            isRelatedPlaylistsPlaying,
            relatedTracks,
            track,

            // Functions
            userPlaylists,
            toggleLike,
            toggleRepost,
            addUpNext,
            togglePlaylistTrack
        } = this.props;

        if (!track || (track && track.loading)) {
            return <Spinner contained={true} />;
        }

        const liked = SC.hasID(track.id, likes.track);
        const reposted = SC.hasID(track.id, reposts.track);

        const image = SC.getImageUrl(track, IMAGE_SIZES.LARGE);

        return (
            <CustomScroll
                className='column withHeader'
                heightRelativeToParent='100%'
                allowOuterScroll={true}
                threshold={300}
                ref={(r) => this.scroll = r}
                onScroll={this.debouncedOnScroll}
                loadMore={this.fetchMore}
                hasMore={this.canFetchMore}
            >

                <Header
                    className='withImage'
                    scrollTop={this.state.scrollTop}
                />

                <PageHeader image={image}>
                    <Row className='trackHeader'>
                        <Col xs='12' md='4' xl='3'>
                            <div className='imageWrapper'>
                                <FallbackImage
                                    src={image}
                                />
                            </div>
                        </Col>

                        <Col xs='12' md='8' xl='' className='trackInfo text-md-left text-xs-center'>
                            <h2>{track.title}</h2>

                            <div className='button-group'>
                                {
                                    SC.isStreamable(track) ? this.renderToggleButton() :
                                        <a href='javascript:void(0)' className='disabled c_btn'>
                                            <span>This track is not streamable</span>
                                        </a>
                                }

                                <a
                                    href='javascript:void(0)'
                                    className={cn('c_btn', { liked })}
                                    onClick={() => {
                                        toggleLike(track.id);
                                    }}
                                >
                                    <i className={liked ? 'bx bxs-heart' : 'bx bx-heart'} />
                                    <span>{liked ? 'Liked' : 'Like'}</span>
                                </a>


                                <a
                                    href='javascript:void(0)'
                                    className={cn('c_btn', { liked: reposted })}
                                    onClick={() => {
                                        toggleRepost(track.id);
                                    }}
                                >
                                    <i className='bx bx-repost' />
                                    <span>{reposted ? 'Reposted' : 'Repost'}</span>
                                </a>


                                {
                                    !track.purchase_url && track.download_url && track.downloadable && (
                                        <a
                                            href='javascript:void(0)'
                                            className='c_btn round'
                                            onClick={() => {
                                                IPC.downloadFile(SC.appendClientId(track.download_url));
                                            }}
                                        >
                                            <i className='bx bxs-download-alt' />
                                        </a>
                                    )
                                }

                                <Popover
                                    autoFocus={false}
                                    minimal={true}
                                    position={Position.BOTTOM_LEFT}
                                    content={(
                                        <Menu>

                                            {
                                                track.purchase_url && (
                                                    <React.Fragment>
                                                        {
                                                            track.purchase_url && (
                                                                <MenuItem
                                                                    icon='link'
                                                                    text={track.purchase_title || 'Download'}
                                                                    onClick={() => {
                                                                        IPC.openExternal(track.purchase_url);
                                                                    }}
                                                                />
                                                            )
                                                        }

                                                        <MenuDivider />
                                                    </React.Fragment>
                                                )
                                            }

                                            <MenuItem text='Add to playlist'>
                                                <div style={{ fontSize: '.8rem', opacity: .8, color: 'grey', padding: '5px' }}>
                                                    I'm sorry, this feature has been disabled to preserve your playlists.
                                                    Since we are unable to fetch all tracks, we do not know for sure if
                                                    we will delete tracks upon adding/removing track via Auryo.
                                                </div>
                                                {/* {
                                                    userPlaylists.map((playlist) => {
                                                        const inPlaylist = !!playlist.items.find((t) => t.id === track.id);

                                                        return (
                                                            <MenuItem
                                                                key={`menu-item-add-to-playlist-${playlist.id}`}
                                                                className={cn({ 'text-primary': inPlaylist })}
                                                                onClick={() => {
                                                                    togglePlaylistTrack(track.id, playlist.id);
                                                                }}
                                                                text={playlist.title}
                                                            />
                                                        );
                                                    })
                                                } */}
                                            </MenuItem>

                                            <MenuItem
                                                text='Add to queue'
                                                onClick={() => {
                                                    addUpNext(track);
                                                }}
                                            />

                                            <MenuDivider />

                                            <MenuItem
                                                text='View in browser'
                                                onClick={() => {
                                                    IPC.openExternal(track.permalink_url);
                                                }}
                                            />

                                            <ShareMenuItem
                                                title={track.title}
                                                permalink={track.permalink_url}
                                                username={track.user.username}
                                            />
                                        </Menu>
                                    )}
                                >
                                    <a href='javascript:void(0)' className='c_btn round'>
                                        <i className='bx bx-dots-horizontal-rounded' />
                                    </a>
                                </Popover>
                            </div>
                        </Col>

                    </Row>


                    <div className='flex tracktabs row'>
                        <a
                            href='javascript:void(0)'
                            className={cn({ active: this.state.activeTab === TabTypes.OVERVIEW })}
                            onClick={() => this.toggle(TabTypes.OVERVIEW)}
                        >
                            Overview
                        </a>

                        <a
                            href='javascript:void(0)'
                            className={cn({ active: this.state.activeTab === TabTypes.RELATED_TRACKS, playing: isRelatedPlaylistsPlaying })}
                            onClick={() => this.toggle(TabTypes.RELATED_TRACKS)}
                        >
                            Related tracks
                        </a>
                    </div>

                </PageHeader>

                <div className='trackDetails container-fluid main_track_content detailPage'>
                    <TabContent activeTab={this.state.activeTab}>

                        {/* OVERVIEW */}
                        <TabPane tabId={TabTypes.OVERVIEW} className='overview'>
                            <TrackOverview
                                track={track}
                                comments={comments}
                            />
                        </TabPane>

                        {/* RELATED TRACKS */}
                        {/* TODO ADD Spinner */}
                        <TabPane tabId={TabTypes.RELATED_TRACKS} className='trackPadding-side'>
                            {
                                (relatedTracks && this.state.activeTab === TabTypes.RELATED_TRACKS) && (
                                    <TrackList
                                        objectId={relatedPlaylistId}
                                        items={relatedTracks.items}
                                        hideFirstTrack={true}
                                    />
                                )
                            }
                        </TabPane>
                    </TabContent>

                </div>
            </CustomScroll>
        );
    }
}

const mapStateToProps = (state: StoreState, props: OwnProps): PropsFromState => {
    const { songId } = props.match.params;
    const { player: { playingTrack, currentPlaylistId, status }, auth } = state;

    const relatedPlaylistId = getPlaylistName(songId, PlaylistTypes.RELATED);

    return {
        playingTrack,
        isRelatedPlaylistsPlaying: currentPlaylistId === relatedPlaylistId && (status === PlayerStatus.PLAYING),
        relatedPlaylistId,
        auth,
        track: getTrackEntity(+songId)(state),
        userPlaylists: getUserPlaylistsCombined(state),
        songIdParam: +songId,
        relatedTracks: getRelatedTracksPlaylistObject(songId)(state),
        comments: getCommentObject(songId)(state),
        previousScrollTop: getPreviousScrollTop(state)
    };
};

const mapDispatchToProps: MapDispatchToProps<PropsFromDispatch, OwnProps> = (dispatch) => bindActionCreators({
    setScrollPosition,
    fetchTrackIfNeeded,
    toggleRepost,
    fetchMore,
    canFetchMoreOf,
    playTrack,
    toggleFollowing,
    addUpNext,
    toggleLike,
    togglePlaylistTrack
}, dispatch);

export default connect<PropsFromState, PropsFromDispatch, OwnProps, StoreState>(mapStateToProps, mapDispatchToProps)(TrackPage);
