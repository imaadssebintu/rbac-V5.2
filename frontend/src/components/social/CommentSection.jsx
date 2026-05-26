import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Avatar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Divider,
  CircularProgress
} from '@mui/material';
import {
  Send,
  EmojiEmotions,
  MoreVert,
  Favorite,
  FavoriteBorder,
  Reply
} from '@mui/icons-material';
import { socialAPI } from '../../services/api';

const CommentSection = ({ postId, initialComments = [], onCommentAdded }) => {
  const [comments, setComments] = useState(initialComments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (initialComments.length === 0) {
      fetchComments();
    }
  }, [postId]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await socialAPI.getComments(postId);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const commentData = {
        content: newComment,
        postId,
        parentId: null
      };

      const response = await socialAPI.addComment(postId, commentData);

      const newCommentObj = {
        ...response.data,
        user: { id: response.data.userId, name: 'You' }
      };

      setComments([...comments, newCommentObj]);
      setNewComment('');

      if (onCommentAdded) {
        onCommentAdded(newCommentObj);
      }

    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleAddReply = async (parentId) => {
    if (!replyText.trim()) return;

    try {
      const replyData = {
        content: replyText,
        postId,
        parentId
      };

      const response = await socialAPI.addComment(postId, replyData);

      const newReply = {
        ...response.data,
        user: { id: response.data.userId, name: 'You' }
      };

      // Find parent comment and add reply
      const updatedComments = comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply]
          };
        }
        return comment;
      });

      setComments(updatedComments);
      setReplyText('');
      setReplyingTo(null);

    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleLikeComment = async (commentId) => {
    try {
      await socialAPI.likeComment(commentId);

      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLiked: !comment.isLiked,
            likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1
          };
        }

        // Check replies too
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(reply =>
              reply.id === commentId
                ? {
                    ...reply,
                    isLiked: !reply.isLiked,
                    likesCount: reply.isLiked ? reply.likesCount - 1 : reply.likesCount + 1
                  }
                : reply
            )
          };
        }

        return comment;
      }));

    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await socialAPI.deleteComment(commentId);

      // Remove comment from state
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      setComments(updatedComments);
      setAnchorEl(null);

    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const CommentItem = ({ comment, level = 0 }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [showReplyInput, setShowReplyInput] = useState(false);

    return (
      <Box sx={{ ml: level * 3, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Avatar sx={{ width: 32, height: 32 }}>
            {comment.user?.name?.charAt(0)}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Box sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 2,
              border: 1,
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {comment.user?.name}
                </Typography>

                <IconButton
                  size="small"
                  onClick={(e) => {
                    setAnchorEl(e.currentTarget);
                    setSelectedComment(comment);
                  }}
                >
                  <MoreVert fontSize="small" />
                </IconButton>
              </Box>

              <Typography variant="body2" paragraph>
                {comment.content}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Typography>

                <IconButton
                  size="small"
                  onClick={() => handleLikeComment(comment.id)}
                  sx={{ color: comment.isLiked ? 'error.main' : 'inherit' }}
                >
                  {comment.isLiked ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    {comment.likesCount || 0}
                  </Typography>
                </IconButton>

                {level < 2 && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      setShowReplyInput(!showReplyInput);
                      if (!showReplyInput) {
                        setReplyingTo(comment.id);
                      }
                    }}
                  >
                    <Reply fontSize="small" />
                    <Typography variant="caption" sx={{ ml: 0.5 }}>
                      Reply
                    </Typography>
                  </IconButton>
                )}
              </Box>
            </Box>

            {/* Reply Input */}
            {showReplyInput && replyingTo === comment.id && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2, ml: 2 }}>
                <Avatar sx={{ width: 24, height: 24 }}>
                  You
                </Avatar>
                <Box sx={{ flex: 1, position: 'relative' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`Reply to ${comment.user?.name}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddReply(comment.id)}
                  />
                  <IconButton
                    size="small"
                    sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <EmojiEmotions fontSize="small" />
                  </IconButton>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleAddReply(comment.id)}
                  disabled={!replyText.trim()}
                >
                  <Send fontSize="small" />
                </IconButton>
              </Box>
            )}

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {showReplies ? (
                  <>
                    {comment.replies.map(reply => (
                      <CommentItem key={reply.id} comment={reply} level={level + 1} />
                    ))}
                    <Button
                      size="small"
                      onClick={() => setShowReplies(false)}
                      sx={{ mt: 1 }}
                    >
                      Hide replies
                    </Button>
                  </>
                ) : (
                  <Button
                    size="small"
                    onClick={() => setShowReplies(true)}
                    sx={{ mt: 1 }}
                  >
                    Show {comment.replies.length} replies
                  </Button>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {/* Comments List */}
      <Box sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : comments.length > 0 ? (
          <>
            {comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
            <div ref={commentsEndRef} />
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No comments yet. Be the first to comment!
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Add Comment */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Avatar sx={{ width: 40, height: 40 }}>
          You
        </Avatar>
        <Box sx={{ flex: 1, position: 'relative' }}>
          <TextField
            fullWidth
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            multiline
            maxRows={3}
          />
          <IconButton
            size="small"
            sx={{ position: 'absolute', right: 8, bottom: 8 }}
          >
            <EmojiEmotions />
          </IconButton>
        </Box>
        <IconButton
          onClick={handleAddComment}
          disabled={!newComment.trim()}
          sx={{ alignSelf: 'flex-end' }}
        >
          <Send />
        </IconButton>
      </Box>

      {/* Comment Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {selectedComment && (
          <>
            <MenuItem onClick={() => {
              setShowReplyInput(true);
              setReplyingTo(selectedComment.id);
              setAnchorEl(null);
            }}>
              Reply
            </MenuItem>
            <MenuItem onClick={() => handleLikeComment(selectedComment.id)}>
              {selectedComment.isLiked ? 'Unlike' : 'Like'}
            </MenuItem>
            {selectedComment.userId === 'current-user-id' && (
              <MenuItem
                onClick={() => handleDeleteComment(selectedComment.id)}
                sx={{ color: 'error.main' }}
              >
                Delete
              </MenuItem>
            )}
            <MenuItem>Report</MenuItem>
            <MenuItem>Copy Text</MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};

export default CommentSection;
