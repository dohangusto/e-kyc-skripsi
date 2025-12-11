import 'package:equatable/equatable.dart';

abstract class KtpCaptureState extends Equatable {
  final String? photoPath;

  const KtpCaptureState({this.photoPath});

  @override
  List<Object?> get props => [photoPath];
}

class KtpCaptureInitial extends KtpCaptureState {
  const KtpCaptureInitial();
}

class KtpCaptureInProgress extends KtpCaptureState {
  const KtpCaptureInProgress({super.photoPath});
}

class KtpCaptureSuccess extends KtpCaptureState {
  const KtpCaptureSuccess({super.photoPath});
}

class KtpCaptureFailure extends KtpCaptureState {
  final String message;

  const KtpCaptureFailure(this.message, {super.photoPath});

  @override
  List<Object?> get props => [message, photoPath];
}
