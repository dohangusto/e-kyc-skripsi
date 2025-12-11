import 'package:equatable/equatable.dart';

abstract class FaceMatchingEvent extends Equatable {
  const FaceMatchingEvent();

  @override
  List<Object?> get props => [];
}

class FaceMatchingStarted extends FaceMatchingEvent {
  const FaceMatchingStarted();
}

class FaceMatchingTakeSelfie extends FaceMatchingEvent {
  const FaceMatchingTakeSelfie();
}

class FaceMatchingUploadSubmitted extends FaceMatchingEvent {
  final String? photoPath;

  const FaceMatchingUploadSubmitted({this.photoPath});

  @override
  List<Object?> get props => [photoPath];
}
