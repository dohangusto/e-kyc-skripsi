import 'package:equatable/equatable.dart';

enum AuthStatus { unknown, authenticated, unauthenticated, loading }

class AuthState extends Equatable {
  final AuthStatus status;
  final String? userId; // nanti bisa diganti entity User
  final String? nik;
  final String? name;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.unknown,
    this.userId,
    this.nik,
    this.name,
    this.errorMessage,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? userId,
    String? nik,
    String? name,
    String? errorMessage,
  }) {
    return AuthState(
      status: status ?? this.status,
      userId: userId ?? this.userId,
      nik: nik ?? this.nik,
      name: name ?? this.name,
      errorMessage: errorMessage,
    );
  }

  @override
  List<Object?> get props => [status, userId, nik, name, errorMessage];
}
