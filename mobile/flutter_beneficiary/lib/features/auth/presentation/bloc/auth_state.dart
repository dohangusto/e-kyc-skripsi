import 'package:equatable/equatable.dart';

enum AuthStatus { unknown, authenticated, unauthenticated, loading }

class AuthState extends Equatable {
  final AuthStatus status;
  final String? userId; // nanti bisa diganti entity User
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.unknown,
    this.userId,
    this.errorMessage,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? userId,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      userId: userId ?? this.userId,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, userId, errorMessage];
}
