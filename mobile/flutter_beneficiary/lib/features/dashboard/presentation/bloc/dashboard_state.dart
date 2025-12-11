import 'package:equatable/equatable.dart';

enum StepStatus { done, inProgress, pending }

class AssistanceInfo extends Equatable {
  final String title;
  final String category;
  final String? group;
  final String amount;
  final String description;
  final String? deliveryMethod;

  const AssistanceInfo({
    required this.title,
    required this.category,
    required this.amount,
    required this.description,
    this.group,
    this.deliveryMethod,
  });

  @override
  List<Object?> get props => [
    title,
    category,
    group,
    amount,
    description,
    deliveryMethod,
  ];
}

class ScheduleInfo extends Equatable {
  final String date;
  final String location;
  final String time;
  final String note;

  const ScheduleInfo({
    required this.date,
    required this.location,
    required this.time,
    required this.note,
  });

  @override
  List<Object?> get props => [date, location, time, note];
}

class TimelineStep extends Equatable {
  final String title;
  final String subtitle;
  final StepStatus status;

  const TimelineStep({
    required this.title,
    required this.subtitle,
    required this.status,
  });

  TimelineStep copyWith({StepStatus? status}) {
    return TimelineStep(
      title: title,
      subtitle: subtitle,
      status: status ?? this.status,
    );
  }

  @override
  List<Object?> get props => [title, subtitle, status];
}

class DashboardState extends Equatable {
  final bool isLoading;
  final AssistanceInfo assistanceInfo;
  final ScheduleInfo? nextSchedule;
  final List<TimelineStep> verificationSteps;
  final List<TimelineStep> aidProgressSteps;
  final String faceMatchingStatus;

  const DashboardState({
    required this.assistanceInfo,
    required this.verificationSteps,
    required this.aidProgressSteps,
    this.nextSchedule,
    this.isLoading = false,
    this.faceMatchingStatus = 'Sedang dicek',
  });

  DashboardState copyWith({
    bool? isLoading,
    AssistanceInfo? assistanceInfo,
    ScheduleInfo? nextSchedule,
    List<TimelineStep>? verificationSteps,
    List<TimelineStep>? aidProgressSteps,
    String? faceMatchingStatus,
  }) {
    return DashboardState(
      assistanceInfo: assistanceInfo ?? this.assistanceInfo,
      verificationSteps: verificationSteps ?? this.verificationSteps,
      aidProgressSteps: aidProgressSteps ?? this.aidProgressSteps,
      nextSchedule: nextSchedule ?? this.nextSchedule,
      isLoading: isLoading ?? this.isLoading,
      faceMatchingStatus: faceMatchingStatus ?? this.faceMatchingStatus,
    );
  }

  @override
  List<Object?> get props => [
    isLoading,
    assistanceInfo,
    nextSchedule,
    verificationSteps,
    aidProgressSteps,
    faceMatchingStatus,
  ];
}
