import User from './user.js';
import Role from './role.js';
import Task from './task.js';
import Payment from './payment.js';
import Message from './message.js';
import PayPalWebhookEvent from './paypalWebhookEvent.js';
import Schedule from './schedule.js';
import Announcement from './announcement.js';
import AuditLog from './auditLog.js';
import Wallet from './wallet.js';
import CoinLedger from './coinLedger.js';
import Rating from './rating.js';
import Certificate from './certificate.js';
import GuideTask from './guideTask.js';
import Review from './review.js';
import Gallery from './gallery.js';
import WithdrawalRequest from './withdrawalRequest.js';

// User - Role relationship
User.belongsTo(Role, { foreignKey: 'role_id', as: 'Role' });
Role.hasMany(User, { foreignKey: 'role_id', as: 'Users' });

// Schedule relationships
Schedule.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
Schedule.belongsTo(User, { foreignKey: 'walker_id', as: 'Walker' });
User.hasMany(Schedule, { foreignKey: 'user_id', as: 'Schedules' });

// Payment relationships
Payment.belongsTo(User, { foreignKey: 'user_id' });
Payment.belongsTo(Task, { foreignKey: 'task_id' });
User.hasMany(Payment, { foreignKey: 'user_id' });
Task.hasMany(Payment, { foreignKey: 'task_id' });

// Wallet and coin ledger relationships
Wallet.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Wallet, { foreignKey: 'user_id' });

CoinLedger.belongsTo(User, { foreignKey: 'user_id' });
CoinLedger.belongsTo(Wallet, { foreignKey: 'wallet_id' });
User.hasMany(CoinLedger, { foreignKey: 'user_id' });
Wallet.hasMany(CoinLedger, { foreignKey: 'wallet_id' });

// Ratings relationships
Rating.belongsTo(User, { foreignKey: 'user_id', as: 'Rater' });
Rating.belongsTo(User, { foreignKey: 'walker_id', as: 'Walker' });
Rating.belongsTo(Task, { foreignKey: 'task_id', as: 'Task' });
User.hasMany(Rating, { foreignKey: 'user_id', as: 'GivenRatings' });
User.hasMany(Rating, { foreignKey: 'walker_id', as: 'ReceivedRatings' });
Task.hasMany(Rating, { foreignKey: 'task_id', as: 'Ratings' });

// Review relationships (traveller -> guide per trip)
Review.belongsTo(User, { foreignKey: 'travellerId', as: 'Traveller' });
Review.belongsTo(User, { foreignKey: 'guideId', as: 'Guide' });
Review.belongsTo(Task, { foreignKey: 'tripId', as: 'Trip' });
User.hasMany(Review, { foreignKey: 'travellerId', as: 'GivenReviews' });
User.hasMany(Review, { foreignKey: 'guideId', as: 'ReceivedReviews' });
Task.hasMany(Review, { foreignKey: 'tripId', as: 'TripReviews' });

// Guide task dispatch relationships
GuideTask.belongsTo(Task, { foreignKey: 'task_id', as: 'Task' });
GuideTask.belongsTo(User, { foreignKey: 'guide_id', as: 'Guide' });
Task.hasMany(GuideTask, { foreignKey: 'task_id', as: 'GuideTasks' });
User.hasMany(GuideTask, { foreignKey: 'guide_id', as: 'AvailableGuideTasks' });

// Message relationships
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'Sender' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'Receiver' });
User.hasMany(Message, { foreignKey: 'sender_id', as: 'SentMessages' });
User.hasMany(Message, { foreignKey: 'receiver_id', as: 'ReceivedMessages' });

// Certificate relationships
Certificate.belongsTo(User, { foreignKey: 'user_id', as: 'User' });
Certificate.belongsTo(User, { foreignKey: 'verified_by', as: 'Verifier' });
User.hasMany(Certificate, { foreignKey: 'user_id', as: 'Certificates' });

export {
    User,
    Role,
    Task,
    Payment,
    Message,
    PayPalWebhookEvent,
    Schedule,
    Announcement,
    AuditLog,
    Wallet,
    CoinLedger,
    Rating,
    Certificate,
    GuideTask,
    Review,
    Gallery,
    WithdrawalRequest
};
