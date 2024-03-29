import { Menu, MenuDivider, MenuItem, Popover, Position, Tooltip } from '@blueprintjs/core';
import cn from 'classnames';
import * as _ from 'lodash';
import * as React from 'react';
import { connect, MapDispatchToProps } from 'react-redux';
import { bindActionCreators } from 'redux';
import { StoreState } from '../../common/store';
import { AuthLikes, AuthReposts } from '../../common/store/auth';
import { CombinedUserPlaylistState, getLikes, getReposts, getUserPlaylistsCombined } from '../../common/store/auth/selectors';
import { addUpNext } from '../../common/store/player';
import { togglePlaylistTrack } from '../../common/store/playlist/playlist';
import { toggleLike, toggleRepost } from '../../common/store/track/actions';
import { SC } from '../../common/utils';
import { IPC } from '../../common/utils/ipc';
import { SoundCloud } from '../../types';
import ShareMenuItem from './ShareMenuItem';

interface OwnProps {
    track: SoundCloud.Music;
    index?: number;
    playing?: boolean;
    currentPlaylistId?: string;
}

interface PropsFromState {
    likes: AuthLikes;
    reposts: AuthReposts;
    userPlaylists: Array<CombinedUserPlaylistState>;
}

interface PropsFromDispatch {
    addUpNext: typeof addUpNext;
    toggleLike: typeof toggleLike;
    toggleRepost: typeof toggleRepost;
    togglePlaylistTrack: typeof togglePlaylistTrack;
}

type AllProps = OwnProps & PropsFromState & PropsFromDispatch;

class ActionsDropdown extends React.Component<AllProps> {

    shouldComponentUpdate(nextProps: AllProps) {
        const { track, likes, index, reposts, userPlaylists } = this.props;

        return track.id !== nextProps.track.id ||
            index !== nextProps.index ||
            !_.isEqual(likes, nextProps.likes) ||
            !_.isEqual(reposts, nextProps.reposts) ||
            !_.isEqual(userPlaylists, nextProps.userPlaylists);
    }

    render() {
        const {
            toggleLike,
            toggleRepost,
            reposts,
            likes,
            track,
            addUpNext,
            playing,
            index,
            userPlaylists,
            togglePlaylistTrack,
            currentPlaylistId
        } = this.props;

        const trackId = track.id;

        const liked = SC.hasID(track.id, (track.kind === 'playlist' ? likes.playlist : likes.track));
        const reposted = SC.hasID(track.id, (track.kind === 'playlist' ? reposts.playlist : reposts.track));

        const currentPlaylist: CombinedUserPlaylistState | null =
            currentPlaylistId ? userPlaylists.find((p) => p.id === +currentPlaylistId) || null : null;

        const inPlaylist = currentPlaylist ? currentPlaylist.items.find((t) => t.id === trackId) : false;

        return (
            <Popover
                className='actions-dropdown'
                autoFocus={false}
                minimal={true}
                position={Position.BOTTOM_LEFT}
                content={(
                    <Menu>
                        <MenuItem
                            className={cn({ 'text-primary': liked })}
                            text={liked ? 'Liked' : 'Like'}
                            onClick={() => toggleLike(trackId, track.kind === 'playlist')}
                        />

                        <MenuItem
                            className={cn({ 'text-primary': reposted })}
                            text={reposted ? 'Reposted' : 'Repost'}
                            onClick={() => toggleRepost(trackId, track.kind === 'playlist')}
                        />

                        {
                            _.isNil(index) && (
                                <MenuItem
                                    text='Add to queue'
                                    onClick={() => addUpNext(track)}
                                />
                            )
                        }

                        {
                            track.kind !== 'playlist' ? (

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
                            ) : null
                        }

                        {/* {
                            currentPlaylist && inPlaylist && (
                                <MenuItem
                                    text='Remove from playlist'
                                    onClick={() => togglePlaylistTrack(track.id, currentPlaylist.id)}
                                />
                            )
                        } */}

                        {
                            index !== undefined && !playing ? (
                                <MenuItem
                                    text='Remove from queue'
                                    onClick={() => addUpNext(track, index)}
                                />
                            ) : null
                        }

                        <MenuDivider />

                        <MenuItem
                            text='View in browser'
                            onClick={() => IPC.openExternal(track.permalink_url)}
                        />
                        <ShareMenuItem
                            title={track.title}
                            permalink={track.permalink_url}
                            username={track.user.username}
                        />

                    </Menu>
                )}
            >
                <a href='javascript:void(0)'>
                    <i className='bx bx-dots-horizontal-rounded' />
                </a>
            </Popover>
        );
    }
}

const mapStateToProps = (state: StoreState): PropsFromState => ({
    userPlaylists: getUserPlaylistsCombined(state),
    likes: getLikes(state),
    reposts: getReposts(state)
});

const mapDispatchToProps: MapDispatchToProps<PropsFromDispatch, OwnProps> = (dispatch) => bindActionCreators({
    addUpNext,
    toggleLike,
    toggleRepost,
    togglePlaylistTrack,
}, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(ActionsDropdown);
