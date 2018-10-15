import React from 'react';
import PropTypes from 'prop-types';

class AppError extends React.Component {

    shouldComponentUpdate(nextProps) {
        const { error } = this.props;

        return error !== nextProps.error;
    }

    render() {
        const { error, initApp } = this.props;

        // TODO fancify

        return (
            <div className="full-width-center">
                <div>
                    <h2>Oops</h2>
                    <p className="alert alert-danger">{error}</p>
                    <a href="javascript:void(0)" className="btn btn-primary" onClick={initApp}>Retry</a>
                </div>
            </div>
        );
    }
}

AppError.propTypes = {
    error: PropTypes.string.isRequired,
    initApp: PropTypes.func.isRequired
};

export default AppError;