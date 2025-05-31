import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import '../../style/Reviews.css'; // Убедитесь, что стили соответствуют макету
import Notification from "../Layout/Notification";

const Reviews = () => {
    const { id } = useParams(); // Получение product_id из URL
    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [newComment, setNewComment] = useState('');
    const [rating, setRating] = useState(0);
    const [visibleReviews, setVisibleReviews] = useState(3);
    const [editingShow, setEditingShow] = useState(false);
    //Состояния для хранения данных для редактирования
    const [editingReviewId, setEditingReviewId] = useState(null);
    const [editingComment, setEditingComment] = useState('');
    const [editingRating, setEditingRating] = useState(0);

    const [user, setUser] = useState(null);
    const [showAuthMessage, setShowAuthMessage] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState({});

    const [notification, setNotification] = useState({ message: "", type: "" });

    const navigate = useNavigate(); // Для навигации

    const processReviewsData = (reviewsData) => {
        const reviewsWithValidRatings = reviewsData.map(review => {
            const user = review.users_id || {}; // Защита от отсутствия users_id

            return {
                ...review,
                rating: parseFloat(review.rating?.$numberDecimal || 0),
                userName: user.name || 'Неизвестный пользователь',
                avatar: user.avatar || 'assets/avatar/avatar_default.png',
                user_id: user._id,
            };
        });

        const validReviews = reviewsWithValidRatings.filter(review =>
            typeof review.rating === 'number' && review.rating > 0 && review.rating <= 5
        );

        const averageRating = validReviews.length > 0
            ? (validReviews.reduce((sum, review) => sum + review.rating, 0) / validReviews.length).toFixed(1)
            : 0;

        return { reviewsWithValidRatings, averageRating };
    };

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const commentsRes = await axios.get(`http://localhost:8081/reviews/${id}`);
                const { reviewsWithValidRatings, averageRating } = processReviewsData(commentsRes.data);

                setReviews(reviewsWithValidRatings);
                setAverageRating(averageRating);
            } catch (error) {
                console.error('Ошибка при загрузке отзывов:', error);
            }
        };

        const fetchUser = async () => {
            try {
                const userRes = await axios.get('http://localhost:8081/', { withCredentials: true });
                setUser(userRes.data.data);
            } catch (error) {
                console.error('Ошибка при загрузке данных пользователя:', error);
            }
        };

        fetchReviews();
        fetchUser();
    }, [id]);

    const refreshComment = async () => {
        try {
            const commentsRes = await axios.get(`http://localhost:8081/reviews/${id}`);
            const { reviewsWithValidRatings, averageRating } = processReviewsData(commentsRes.data);

            setReviews(reviewsWithValidRatings);
            setAverageRating(averageRating);
        } catch (error) {
            console.error('Ошибка при загрузке отзывов:', error);
        }
    };

    const showNotification = (message, type = "success") => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: "", type: "" }), 3000);
    };

    const handleCommentSubmit = async () => {
        if (!user) {
            setShowAuthMessage(true);
            return;
        }

        if (!newComment.trim() || rating <= 0) {
            showNotification("Пожалуста, добавте комментарий и выберите рейтинг", "danger");
            return;
        }

        try {
            await axios.post(`http://localhost:8081/reviews`, {
                products_id: id,
                comment: newComment,
                rating: rating,
                users_id: user.userId

            }, { withCredentials: true });
            refreshComment();
            setNewComment('');
            setRating(0);
            setShowAuthMessage(false);
        } catch (error) {
            console.error('Ошибка при добавлении комментария:', error);
        }
    };

    const handleCommentDelete = async (commentId) => {
        try {
            await axios.delete(`http://localhost:8081/reviews/${commentId}`, { withCredentials: true });
            
            const updatedReviews = reviews.filter(review => review._id !== commentId);
            setReviews(updatedReviews);
    
            const validReviews = updatedReviews.filter(review => typeof review.rating === 'number' && review.rating > 0 && review.rating <= 5);
            if (validReviews.length > 0) {
                const totalRating = validReviews.reduce((sum, review) => sum + review.rating, 0);
                setAverageRating((totalRating / validReviews.length).toFixed(1));
            } else {
                setAverageRating(0);
            }
        } catch (error) {
            console.error('Ошибка при удалении комментария:', error);
        }
    };
    

    const handleEditModal = async (review) => {
        console.log(review)
        setEditingReviewId(review._id);
        setEditingComment(review.comment);
        setEditingRating(review.rating)
        setEditingShow(true);
    }
    const CloseEditModal = async () => {
        setEditingShow(false);
        setEditingComment('');
        setEditingRating(0);
        setEditingReviewId('');
        setOptionsVisible({});
    }

    const handleCommentEdit = async (commentId) => {
        try {
            await axios.put(`http://localhost:8081/reviews/${commentId}`, {
                comment: editingComment,
                rating: editingRating
            }, { withCredentials: true });
            setEditingReviewId('');
            setEditingComment('');
            setEditingRating(0);
            setEditingShow(false);
            refreshComment();
            setOptionsVisible({});
        } catch (error) {
            console.error('Ошибка при редактировании комментария:', error);
        }
    };

    const handleStarClick = (ratingValue) => {
        if (editingRating) {
            setEditingRating(ratingValue);
        } else {
            setRating(ratingValue);
        }
    };

    const loadMoreReviews = () => {
        setVisibleReviews(visibleReviews + 3);
    };

    const toggleReviewOptions = (reviewId) => {
        setOptionsVisible(prev => ({
            ...prev,
            [reviewId]: !prev[reviewId]
        }));
    };

    return (
        <div className="container reviews-section">
            <div className="reviews-header">
                <div className="rating-summary">
                    <h2>{averageRating}</h2>
                    <p>из {reviews.length} отзывов</p>
                    <div className="stars">
                        {[...Array(5)].map((star, index) => (
                            <span key={index} className={index < Math.floor(averageRating) ? "star-filled" : "star-empty"}>
                                ★
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="reviews-list">
                {reviews.slice(0, visibleReviews).map(review => (
                    <div key={review._id} className="review-card">
                        <div className="review-header">
                            <img src={`http://localhost:8081/${review.avatar}`} alt={review.userName} className="avatar" />
                            <div className="review-info">
                                <h4>{review.userName}</h4>
                                <div className="stars">
                                    {[...Array(5)].map((star, index) => (
                                        <span key={index} className={index < review.rating ? "star-filled" : "star-empty"}>
                                            ★
                                        </span>
                                    ))}
                                </div>
                                <p>{new Date(review.createdAt).toLocaleString()}</p>
                            </div>
                            {user && user.userId === review.user_id && (
                                <div className="review-options">
                                    <button className="options-toggle" onClick={() => toggleReviewOptions(review._id)}>⋯</button>
                                    {optionsVisible[review._id] && (
                                        <div className="options-menu">
                                            {editingShow ? (
                                                <>
                                                    <button onClick={() => handleCommentEdit(review._id)}>Сохранить</button>
                                                    <button onClick={CloseEditModal}>Отмена</button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleEditModal(review)}>Редактировать</button>
                                                    <button onClick={() => handleCommentDelete(review._id)}>Удалить</button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="review-content">
                            {editingShow && editingReviewId === review._id ? (
                                <div className="edit-form">
                                    <textarea
                                        value={editingComment}
                                        onChange={(e) => setEditingComment(e.target.value)}
                                    />
                                    <div className="stars">
                                        {[...Array(5)].map((star, index) => (
                                            <span
                                                key={index}
                                                className={index < editingRating ? "star-filled" : "star-empty"}
                                                onClick={() => handleStarClick(index + 1)}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p>{review.comment}</p>
                            )}
                        </div>
                    </div>
                ))}
                {visibleReviews < reviews.length && (
                    <button className="load-more-button" onClick={loadMoreReviews}>
                        Загрузить еще
                    </button>
                )}
            </div>

            <div className="review-form">
                {showAuthMessage && (
                    <p className="auth-message">Пожалуйста, войдите в систему, чтобы оставить отзыв.</p>
                )}
                <textarea
                    placeholder="Напишите свой отзыв"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="stars">
                    {[...Array(5)].map((star, index) => (
                        <span
                            key={index}
                            className={index < rating ? "star-filled" : "star-empty"}
                            onClick={() => handleStarClick(index + 1)}
                        >
                            ★
                        </span>
                    ))}
                </div>
                <button onClick={handleCommentSubmit}>Отправить</button>
            </div>
            {notification.message && (
                <Notification message={notification.message} type={notification.type} />
            )}
        </div>
    );
};

export default Reviews;
