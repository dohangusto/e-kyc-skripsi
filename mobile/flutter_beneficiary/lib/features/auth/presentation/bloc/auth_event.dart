import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

class AuthLoginRequested extends AuthEvent {
  final String phoneNumber;

  const AuthLoginRequested(this.phoneNumber);

  @override
  List<Object?> get props => [phoneNumber];
}

class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}
