import { Icon, Menu, MenuDivider, MenuItem, Popover, Position } from '@blueprintjs/core';
import cn from 'classnames';
import { ipcRenderer } from 'electron';
import isEqual from 'lodash/isEqual';
import React, { ReactNode } from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router';
import { push, replace } from 'react-router-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { show } from 'redux-modal';
import { EVENTS } from '../../../../../shared/constants/events';
import { StoreState } from '../../../../../shared/store';
import { CanGoHistory, UpdateInfo } from '../../../../../shared/store/app';
import { AuthUser, logout } from '../../../../../shared/store/auth';
import Sticky from '../../../_shared/Sticky';
import SearchBox from './Search/SearchBox';
import User from './User/User';

interface OwnProps {
    children: ReactNode;
    className?: string;
    scrollTop: number;
    query?: string;
    focus: boolean;

}

interface PropsFromState {
    me: AuthUser | null;
    locHistory: CanGoHistory;
    update: UpdateInfo;
}

interface PropsFromDispatch {
    logout: typeof logout;
    show: typeof show;
    push: typeof push;
    replace: typeof replace;
}

interface State {
    height: number;
}

type AllProps = OwnProps & PropsFromState & PropsFromDispatch & RouteComponentProps<{}>;

class Header extends React.Component<AllProps, State> {

    static defaultProps = {
        className: '',
        query: '',
        focus: false,
        children: null
    };

    state = {
        height: 0
    };

    private navBarWrapper: HTMLDivElement | null;
    private search: SearchBox | null;

    componentDidMount() {
        const { focus } = this.props;

        if (this.navBarWrapper) {
            this.setState({
                height: this.navBarWrapper.clientHeight
            });
        }

        if (focus && this.search) {
            this.search.focus();
        }
    }

    componentWillReceiveProps() {
        const { height } = this.state;

        if (this.navBarWrapper && height !== this.navBarWrapper.clientHeight) {
            this.setState({
                height: this.navBarWrapper.clientHeight
            });
        }
    }

    shouldComponentUpdate(nextProps: AllProps, nextState: State) {
        const { scrollTop, locHistory, me, update } = this.props;

        return !isEqual(locHistory, nextProps.locHistory) ||
            me !== nextProps.me ||
            (this.navBarWrapper && nextState.height !== this.navBarWrapper.clientHeight) ||
            nextProps.update !== update ||
            (scrollTop < 52 && nextProps.scrollTop > 52) ||
            (scrollTop > 52 && nextProps.scrollTop < 52);
    }

    goBack = () => {
        const { locHistory: { back }, history } = this.props;

        if (back) {
            history.goBack();
        }
    }

    goForward = () => {
        const { locHistory: { next }, history } = this.props;

        if (next) {
            history.goForward();
        }
    }

    showUtilitiesModal = (activeTab: string) => {
        const { show } = this.props;

        show('utilities', {
            activeTab
        });
    }

    doUpdate() {
        ipcRenderer.send(EVENTS.APP.UPDATE);
    }

    handleSearch = (prev: string, rawQuery?: string) => {
        if (!rawQuery) {
            replace('/search');
            return;
        }

        const searchQuery = escape(rawQuery.replace('%', ''));

        if (prev) {
            replace(`/search`, { query: searchQuery });
        } else {
            push(`/search`, { query: searchQuery });
        }
    }

    render() {
        const { locHistory: { next, back }, me, logout, scrollTop, className, query, children, update } = this.props;

        const { height } = this.state;

        return (
            <div className={`header-wrapper ${className}`} style={{ minHeight: height }}>
                <Sticky
                    className='stickymaker'
                    activeClassName='sticky sticky-3'
                    stickyWidth={`calc(100% - ${260}px)`}
                    isSticky={scrollTop - 52 > 0}
                >

                    <div className='navbar-wrapper' ref={(navBarWrapper) => this.navBarWrapper = navBarWrapper}>
                        <nav className='navbar justify-content-between'>
                            <div className='d-flex flex-nowrap align-items-center'>
                                <div className='control-nav'>
                                    <div className='control-nav-inner flex'>
                                        <a className={cn({ disabled: !back })}
                                            href='javascript:void(0)'
                                            onClick={this.goBack.bind(this)}>
                                            <i className='icon-keyboard_arrow_left' />
                                        </a>
                                        <a className={cn({ disabled: !next })}
                                            href='javascript:void(0)'
                                            onClick={this.goForward.bind(this)}>
                                            <i className='icon-keyboard_arrow_right' />
                                        </a>
                                    </div>
                                </div>

                                <SearchBox
                                    ref={(r) => this.search = r}
                                    initialValue={query}
                                    handleSearch={this.handleSearch} />
                            </div>

                            <div className='d-flex align-items-center justify-content-between'>
                                <User me={me} />

                                <Popover autoFocus={false} minimal={true} content={(
                                    <Menu>

                                        <MenuItem text='About' icon='info-sign'
                                            onClick={this.showUtilitiesModal.bind(this, 'about')} />

                                        <MenuItem text='Settings' icon='cog'
                                            onClick={this.showUtilitiesModal.bind(this, 'settings')} />

                                        {
                                            update.available && (
                                                <MenuItem className='text-primary' text='Update' icon='box'
                                                    onClick={this.doUpdate} />
                                            )
                                        }

                                        <MenuDivider />

                                        <MenuItem text='Contribute' href='https://github.com/Superjo149/auryo/' />
                                        <MenuItem text='Report an issue' href='https://github.com/Superjo149/auryo/issues' />
                                        <MenuItem text='Suggest a feature' href='https://github.com/Superjo149/auryo/issues' />
                                        <MenuItem text='Donate' href='https://opencollective.com/auryo' />

                                        <MenuDivider />

                                        <MenuItem text='Logout' icon='log-out'
                                            onClick={logout} />

                                    </Menu>
                                )} position={Position.BOTTOM_RIGHT}>
                                    <a href='javascript:void(0)' className='toggle'>
                                        <Icon icon='more' />
                                        {
                                            update.available && (
                                                <sup data-show='true' title='5' />
                                            )
                                        }
                                    </a>
                                </Popover>
                            </div>
                        </nav>
                        <div>{children && children}</div>
                    </div>
                </Sticky>
            </div>
        );
    }
}

const mapStateToProps = ({ app, auth }: StoreState): PropsFromState => ({
    update: app.update,
    me: auth.me,
    locHistory: app.history
});

const mapDispatchToProps = (dispatch: Dispatch<any>): PropsFromDispatch => bindActionCreators({
    logout,
    show,
    push,
    replace,
}, dispatch);

export default withRouter(connect<PropsFromState, PropsFromDispatch, OwnProps, StoreState>(mapStateToProps, mapDispatchToProps)(Header));
