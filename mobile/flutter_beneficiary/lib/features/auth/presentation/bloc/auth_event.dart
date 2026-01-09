import 'package:equatable/equatable.dart';

abstract class AuthEvent extends Equatable {
  const AuthEvent();

  @override
  List<Object?> get props => [];
}

class AuthCheckRequested extends AuthEvent {
  const AuthCheckRequested();
}

class AuthEligibilitySubmitted extends AuthEvent {
  final String nik;
  final String name;

  const AuthEligibilitySubmitted({required this.nik, required this.name});

  @override
  List<Object?> get props => [nik, name];
}

class AuthLoginRequested extends AuthEvent {
  final String phone;

  const AuthLoginRequested(this.phone);

  @override
  List<Object?> get props => [phone];
}

class AuthLogoutRequested extends AuthEvent {
  const AuthLogoutRequested();
}
