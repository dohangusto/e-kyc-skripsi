import 'package:equatable/equatable.dart';

abstract class KtpCaptureEvent extends Equatable {
  const KtpCaptureEvent();

  @override
  List<Object?> get props => [];
}

class KtpCaptureStarted extends KtpCaptureEvent {
  const KtpCaptureStarted();
}

class KtpCaptureTakePhoto extends KtpCaptureEvent {
  const KtpCaptureTakePhoto();
}

class KtpCaptureUploadSuccess extends KtpCaptureEvent {
  final String photoPath;

  const KtpCaptureUploadSuccess(this.photoPath);

  @override
  List<Object?> get props => [photoPath];
}

class KtpCaptureUploadFailure extends KtpCaptureEvent {
  final String message;

  const KtpCaptureUploadFailure(this.message);

  @override
  List<Object?> get props => [message];
}
