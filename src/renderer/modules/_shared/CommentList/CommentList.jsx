import PropTypes from 'prop-types';
import React, { Component } from 'react';
import ReactList from 'react-list';
import Spinner from '../Spinner/Spinner';
import './commentList.scss';
import CommentListItem from './CommentListItem';

class CommentList extends Component {

    static propTypes = {
        comments: PropTypes.object.isRequired,
        comment_entities: PropTypes.object.isRequired,
        user_entities: PropTypes.object.isRequired
    }

    static defaultProps = {
        comments: {
            items: []
        }
    }

    constructor() {
        super()

        this.renderItem = this.renderItem.bind(this)
    }

    renderItem(index, key) {
        const { comments, comment_entities, user_entities } = this.props

        const commentId = comments.items[index]

        const comment = comment_entities[commentId]
        const user = user_entities[comment.user_id]

        return (
            <CommentListItem key={`comment-${commentId}`} user={user} comment={comment} />
        )
    }

    render() {
        const { comments } = this.props

        const items = comments.items || []

        return (
            <div className="comments">
                <ReactList
                    pageSize={5}
                    type="uniform"
                    length={items.length}
                    itemRenderer={this.renderItem}
                    useTranslate3d={true}
                    useStaticSize={true}
                />
                {(comments.isFetching) ? <Spinner /> : null}
            </div>
        )
    }
}

export default CommentList
